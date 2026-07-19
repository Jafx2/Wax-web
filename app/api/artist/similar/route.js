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

const LIMIT_FINAL = 10

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')
  const originGenres = (searchParams.get('genres') || '').toLowerCase().split(',').map(g => g.trim()).filter(Boolean)

  if (!name) {
    return Response.json({ artists: [] })
  }

  try {
    // Pedimos más candidatos de los que necesitamos, para tener margen tras filtrar por género
    const lastfmRes = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist=${encodeURIComponent(name)}&api_key=d98e3e57fa365982f4f7e4f729edce51&format=json&limit=25`,
      { next: { revalidate: 86400 } } // cache de 24h, misma info todo el dia
    )
    const lastfmData = await lastfmRes.json()
    const candidates = (lastfmData.similarartists?.artist || []).map(a => a.name).slice(0, 25)

    if (candidates.length === 0) {
      return Response.json({ artists: [] })
    }

    const token = await getSpotifyToken()

    // Promise.all para paralelizar todas las busquedas en Spotify de una vez
    const enriched = await Promise.all(
      candidates.map(async (candidateName) => {
        try {
          const res = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(candidateName)}&type=artist&limit=1`,
            { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 86400 } }
          )
          const data = await res.json()
          const sp = data.artists?.items?.[0]
          if (!sp) return null
          return {
            id: sp.id,
            name: sp.name,
            image: sp.images?.[0]?.url || '',
            genres: (sp.genres || []).map(g => g.toLowerCase()),
          }
        } catch {
          return null
        }
      })
    )

    const valid = enriched.filter(Boolean)

    // Filtro de seguridad: solo artistas que comparten al menos un genero con el original
    let filtered = valid
    if (originGenres.length > 0) {
      filtered = valid.filter(a => a.genres.some(g => originGenres.includes(g)))
    }

    // Si el filtro dejo muy pocos, completamos con los mejor rankeados aunque no coincidan
    let final = filtered
    if (final.length < LIMIT_FINAL) {
      const remaining = valid.filter(a => !final.includes(a))
      final = [...final, ...remaining].slice(0, LIMIT_FINAL)
    } else {
      final = final.slice(0, LIMIT_FINAL)
    }

    return Response.json({
      artists: final.map(({ id, name, image }) => ({ id, name, image })),
    })
  } catch (e) {
    return Response.json({ artists: [] })
  }
}