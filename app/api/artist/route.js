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

    // 2. Canciones y álbumes desde iTunes (no requiere OAuth)
    const itunesSearch = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artist.name)}&entity=song&limit=50&sort=popular`,
      { next: { revalidate: 3600 } }
    )
    const itunesSongs = await itunesSearch.json()

    // Detectar el artistId correcto: puede haber varios artistas homónimos en iTunes,
    // así que nos quedamos con el que más resultados tiene (el más popular / el correcto)
    const nameMatches = (itunesSongs.results || []).filter(
      t => t.artistName?.toLowerCase() === artist.name.toLowerCase()
    )
    const idCounts = {}
    nameMatches.forEach(t => {
      idCounts[t.artistId] = (idCounts[t.artistId] || 0) + 1
    })
    const correctItunesArtistId = Object.keys(idCounts).sort((a, b) => idCounts[b] - idCounts[a])[0]

    const itunesAlbums = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(artist.name)}&entity=album&limit=20`,
      { next: { revalidate: 3600 } }
    )
    const itunesAlbumsData = await itunesAlbums.json()

    // Top tracks — filtrar solo del artista correcto (por ID, no solo nombre)
    const topTracks = (itunesSongs.results || [])
      .filter(t => String(t.artistId) === String(correctItunesArtistId) && t.previewUrl)
      .slice(0, 10)
      .map((t, i) => ({
        id: String(t.trackId),
        name: t.trackName,
        image: (t.artworkUrl100 || '').replace('100x100bb', '300x300bb'),
        albumName: t.collectionName || '',
        duration: t.trackTimeMillis,
        preview: t.previewUrl || '',
        popularity: Math.round(100 - (i * 8)), // aproximado por orden
        number: i + 1,
      }))

    // Álbumes — filtrar del artista correcto (por ID), con fallback a nombre si no hay coincidencias
    const albumsByIdRaw = (itunesAlbumsData.results || []).filter(
      a => String(a.artistId) === String(correctItunesArtistId)
    )
    const albumsSource = albumsByIdRaw.length > 0
      ? albumsByIdRaw
      : (itunesAlbumsData.results || []).filter(
          a => a.artistName?.toLowerCase() === artist.name.toLowerCase()
        )

    const seen = new Set()
    const albums = albumsSource
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