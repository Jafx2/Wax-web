// app/api/lastfm/route.js

const LASTFM_KEY = 'd98e3e57fa365982f4f7e4f729edce51'
const COUNTRY_CODES = { mx:'mx', es:'es', ar:'ar', co:'co', cl:'cl', ve:'ve', pe:'pe', hn:'hn' }

let cachedToken = null
let tokenExpiry = 0

async function getSpotifyToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  cachedToken = data.access_token
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000
  return cachedToken
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const country = COUNTRY_CODES[searchParams.get('country')] || 'mx'

    // ── 1. ÁLBUMES desde iTunes ───────────────────────────
    const albumsRes = await fetch(
      `https://itunes.apple.com/${country}/rss/topalbums/limit=18/json`
    )
    const albumsData = await albumsRes.json()
    const currentYear = new Date().getFullYear().toString()

    const albums = (albumsData.feed?.entry || []).map(a => ({
      name: a['im:name']?.label || '',
      artist: a['im:artist']?.label || '',
      image: a['im:image']?.[2]?.label?.replace('170x170', '600x600') || '',
      releaseDate: a['im:releaseDate']?.label || '',
      id: a['id']?.attributes?.['im:id'] || '',
    })).filter(a => a.image && a.releaseDate?.startsWith(currentYear))

    // ── 2. TRACKS desde iTunes ────────────────────────────
    let tracks = []
    try {
      const tracksRes = await fetch(
        `https://itunes.apple.com/${country}/rss/topsongs/limit=10/json`
      )
      const tracksData = await tracksRes.json()
      tracks = (tracksData.feed?.entry || []).map(t => ({
        name: t['im:name']?.label || '',
        artist: t['im:artist']?.label || '',
        image: t['im:image']?.[2]?.label?.replace('170x170', '600x600') || '',
        popularity: 0,
        id: t['id']?.attributes?.['im:id'] || '',
      })).filter(t => t.image)
    } catch (e) {
      console.log('iTunes tracks error:', e.message)
    }

    // ── 3. ARTISTAS: Last.fm (nombres limpios) + Spotify/iTunes (fotos) ──
    let artists = []
    try {
      // PASO 1: Nombres reales desde Last.fm
      const lfmRes = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=chart.getTopArtists&api_key=${LASTFM_KEY}&format=json&limit=12`
      )
      const lfmData = await lfmRes.json()
      const artistNames = (lfmData.artists?.artist || [])
        .map(a => a.name)
        .filter(Boolean)
        .slice(0, 8)

      // FILTRAR con Gemini (si está disponible) para reducir falsos positivos
      let filteredNames = artistNames
      try {
        filteredNames = await geminiFilterArtists(artistNames)
      } catch (err) {
        console.log('geminiFilterArtists failed:', err?.message || err)
        filteredNames = artistNames
      }

      // PASO 2: Foto oficial desde Spotify (solo artistas reales)
      let token = null
      try {
        token = await getSpotifyToken()
      } catch (err) {
        console.log('Spotify token error:', err.message)
      }

      if (!token) {
        // Si no hay token, no intentamos fallback: dejamos artists vacío
        artists = []
      } else {
        artists = await Promise.all(
          filteredNames.map(async (name) => {
            try {
              const spRes = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=5`,
                { headers: { Authorization: `Bearer ${token}` } }
              )
              const spData = await spRes.json()
              const items = spData.artists?.items || []

              // Normalización simple de nombres para comparaciones
              const normalize = (s = '') => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
              const target = normalize(name)

              for (const sp of items) {
                // Obtener detalles completos del artista por id (incluye popularity y followers)
                let detail = sp
                try {
                  const detRes = await fetch(`https://api.spotify.com/v1/artists/${sp.id}`, { headers: { Authorization: `Bearer ${token}` } })
                  const detData = await detRes.json()
                  if (detData && detData.id) detail = detData
                } catch (err) {
                  // ignore detail fetch errors and fall back to search item
                }

                const spName = normalize(detail.name || sp.name)
                const hasImage = (detail.images || sp.images || []).length > 0
                const followers = detail.followers?.total || 0
                const popularity = typeof detail.popularity === 'number' ? detail.popularity : (sp.popularity || 0)
                // Criterios de aceptación:
                // - debe tener imagen
                // - y nombre normalizado exacto (ignorando prefijo 'the')
                const stripThe = s => s.replace(/^the /, '')
                const nameMatch = spName === target || stripThe(spName) === stripThe(target)

                if (hasImage && nameMatch) {
                  console.log('Artist accepted (name match):', { requested: name, found: detail.name || sp.name })
                  return {
                    id: detail.id || sp.id,
                    name: detail.name || sp.name,
                    image: (detail.images || sp.images || [])[0]?.url || '',
                    spotifyId: detail.id || sp.id,
                  }
                }
              }
            } catch (err) {
              console.log('Spotify search error for', name, err?.message || err)
            }

            return null
          })
        )

        artists = artists.filter(Boolean)
      }
    } catch (e) {
      console.log('Artists error:', e.message)
      // No fallback: si falla algo inesperado, dejar artists vacío
      artists = []
    }

    return Response.json({ albums, artists, tracks })
  } catch (e) {
    console.error('Route error:', e)
    return Response.json({ error: e.message, albums: [], artists: [], tracks: [] }, { status: 500 })
  }
}

// Llama a Gemini (Google Generative API) para filtrar nombres de artistas.
async function geminiFilterArtists(names = []) {
  const key = process.env.GEMINI_API_KEY
  if (!key || !names || !names.length) return names

  try {
    const prompt = `Filter the following JSON array of names and return a JSON array (only) of up to 8 names that are musical recording artists (singers or bands). Keep the original order when possible. Respond with ONLY a JSON array, no extra text.\n\n${JSON.stringify(names)}`

    const res = await fetch('https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        prompt: { messages: [{ role: 'user', content: prompt }] },
        temperature: 0.0,
        maxOutputTokens: 256,
      }),
    })

    const text = await res.text()

    // Intentar extraer primer array JSON presente en la respuesta
    try {
      // si la respuesta ya es un array JSON puro
      const maybe = JSON.parse(text)
      if (Array.isArray(maybe)) {
        const strs = maybe.filter(x => typeof x === 'string' && x.trim()).slice(0, 8)
        if (strs.length) return strs
      }
    } catch (e) {
      // continuar
    }

    const match = text.match(/\[[\s\S]*?\]/)
    if (match) {
      try {
        const arr = JSON.parse(match[0])
        if (Array.isArray(arr)) {
          const strs = arr.filter(x => typeof x === 'string' && x.trim()).slice(0, 8)
          if (strs.length) return strs
        }
      } catch (e) {}
    }

    console.log('geminiFilterArtists: could not parse response as array of strings, returning original list')
  } catch (err) {
    console.log('geminiFilterArtists error:', err?.message || err)
  }

  return names
}