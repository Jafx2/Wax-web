// app/api/artist/route.js

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET

let cachedToken = null
let tokenExpiry = 0

async function getSpotifyToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return cachedToken
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const query = searchParams.get('q')

  if (!id && !query) {
    return Response.json({ error: 'id o q requerido' }, { status: 400 })
  }

  try {
    const token = await getSpotifyToken()
    const headers = { Authorization: `Bearer ${token}` }

    // ── BÚSQUEDA POR NOMBRE ──────────────────────────────
    if (query) {
      const res = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=artist&limit=6`,
        { headers }
      )
      const data = await res.json()
      const artists = (data.artists?.items || []).map(a => ({
        id: a.id,
        name: a.name,
        image: a.images?.[0]?.url || '',
        followers: a.followers?.total || 0,
        genres: a.genres || [],
        popularity: a.popularity || 0,
      }))
      return Response.json({ artists })
    }

    // ── DATOS COMPLETOS POR ID ───────────────────────────
    // 1. Info del artista desde Spotify
    const artistRes = await fetch(
      `https://api.spotify.com/v1/artists/${id}`,
      { headers, next: { revalidate: 3600 } }
    )
    const artistData = await artistRes.json()

    if (artistData.error) {
      return Response.json({ error: artistData.error.message }, { status: artistData.error.status })
    }

    const artist = {
      id: artistData.id,
      name: artistData.name,
      image: artistData.images?.[0]?.url || '',
      imageMedium: artistData.images?.[1]?.url || '',
      followers: artistData.followers?.total || 0,
      genres: artistData.genres || [],
      popularity: artistData.popularity || 0,
    }

    // 2. Buscar el artista específico en iTunes (entidad musicArtist, no canciones sueltas)
    // Esto evita el problema de homónimos: buscamos varios candidatos y elegimos
    // el que mejor coincida con el género reportado por Spotify.
    const itunesArtistSearch = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artist.name)}&entity=musicArtist&limit=5`,
      { next: { revalidate: 3600 } }
    )
    const itunesArtistData = await itunesArtistSearch.json()
    const candidates = (itunesArtistData.results || []).filter(
      c => c.artistName?.toLowerCase() === artist.name.toLowerCase()
    )

    let correctItunesArtistId = candidates[0]?.artistId || null

    if (candidates.length > 1 && artist.genres.length > 0) {
      const spotifyGenreWords = artist.genres.join(' ').toLowerCase()
      const bestMatch = candidates.find(c =>
        c.primaryGenreName && spotifyGenreWords.includes(c.primaryGenreName.toLowerCase())
      )
      if (bestMatch) correctItunesArtistId = bestMatch.artistId
    }

    let topTracks = []
    let albums = []

    if (correctItunesArtistId) {
      // 3. Traer discografía y canciones directamente por ID (fuente única, sin ambigüedad)
      const [songsRes, albumsRes] = await Promise.all([
        fetch(
          `https://itunes.apple.com/lookup?id=${correctItunesArtistId}&entity=song&limit=50`,
          { next: { revalidate: 3600 } }
        ),
        fetch(
          `https://itunes.apple.com/lookup?id=${correctItunesArtistId}&entity=album&limit=50`,
          { next: { revalidate: 3600 } }
        ),
      ])
      const songsData = await songsRes.json()
      const albumsData = await albumsRes.json()

      topTracks = (songsData.results || [])
        .filter(t => t.wrapperType === 'track' && t.previewUrl)
        .sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0))
        .slice(0, 10)
        .map((t, i) => ({
          id: String(t.trackId),
          name: t.trackName,
          image: (t.artworkUrl100 || '').replace('100x100bb', '300x300bb'),
          albumName: t.collectionName || '',
          duration: t.trackTimeMillis,
          preview: t.previewUrl || '',
          popularity: Math.round(100 - (i * 8)),
          number: i + 1,
        }))

      const seen = new Set()
      albums = (albumsData.results || [])
        .filter(a => a.wrapperType === 'collection')
        .filter(a => {
          const key = a.collectionName?.toLowerCase()
          if (!key || seen.has(key)) return false
          seen.add(key)
          return true
        })
        .map(a => {
          const isSingle = a.trackCount <= 1 || /-\s*(single|ep)$/i.test(a.collectionName || '')
          return {
            id: String(a.collectionId),
            name: a.collectionName,
            image: (a.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
            year: a.releaseDate ? new Date(a.releaseDate).getFullYear() : '',
            type: isSingle ? 'single' : 'album',
            totalTracks: a.trackCount || 0,
          }
        })
        .sort((a, b) => (b.year || 0) - (a.year || 0))
    }

// 4. Info adicional del artista via MusicBrainz
    let musicbrainzInfo = null
    try {
      const mbRes = await fetch(
        `${request.nextUrl.origin}/api/artist/info?name=${encodeURIComponent(artist.name)}`
      )
      const mbData = await mbRes.json()
      musicbrainzInfo = mbData.result
    } catch {}

    return Response.json({ artist, topTracks, albums, musicbrainzInfo })

  } catch (e) {
    console.error('Artist API error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}