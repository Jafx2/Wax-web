import { supabaseAdmin } from '../../../lib/supabaseAdmin'

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

// Busca un artista en Spotify. Si nos topamos con rate limit (429),
// espera lo que Spotify pida (o un fallback) y reintenta una vez más
// antes de rendirse.
async function searchSpotifyArtist(name, token, retriesLeft = 1) {
  try {
    const res = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
      { headers: { Authorization: `Bearer ${token}` }, next: { revalidate: 86400 } }
    )

    if (res.status === 429) {
      if (retriesLeft <= 0) return null
      const retryAfter = parseInt(res.headers.get('retry-after') || '2', 10)
      await new Promise(r => setTimeout(r, (retryAfter + 0.5) * 1000))
      return searchSpotifyArtist(name, token, retriesLeft - 1)
    }

    const data = await res.json()
    const sp = data.artists?.items?.[0]
    if (!sp) return null
    return { id: sp.id, name: sp.name, image: sp.images?.[0]?.url || '' }
  } catch {
    return null
  }
}

// Resuelve una lista de nombres en Spotify en tandas pequeñas, con una
// pausa entre cada tanda, en vez de disparar todo de golpe. Así evitamos
// tumbar el rate limit cuando exploramos un género nuevo por primera vez.
const BATCH_SIZE = 5
const BATCH_DELAY_MS = 300

async function resolveArtistsBatched(names, token) {
  const results = []
  for (let i = 0; i < names.length; i += BATCH_SIZE) {
    const batch = names.slice(i, i + BATCH_SIZE)
    const resolved = await Promise.all(batch.map(name => searchSpotifyArtist(name, token)))
    results.push(...resolved)
    if (i + BATCH_SIZE < names.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS))
    }
  }
  return results
}

const PAGE_SIZE = 20
const MAX_PAGES = 10 // tope de 200 artistas por género (10 pestañas de 20)
const LASTFM_FETCH_SIZE = 50 // cuántos candidatos pedimos a Last.fm por intento
const MAX_ATTEMPTS = 4 // intentos de traer más candidatos si hay muchos duplicados

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const tag = searchParams.get('tag')
  const page = Math.max(1, Math.min(MAX_PAGES, parseInt(searchParams.get('page') || '1', 10)))

  if (!tag) {
    return Response.json({ artists: [], hasMore: false, totalPages: 0 })
  }

  const start = (page - 1) * PAGE_SIZE
  const end = start + PAGE_SIZE

  try {
    // 1. Lo que ya está guardado para este tag, en orden estable
    const { data: existingRows } = await supabaseAdmin
      .from('genre_artist_cache')
      .select('spotify_id, name, image, position')
      .eq('tag', tag)
      .order('position', { ascending: true })

    let cache = existingRows || []
    const knownIds = new Set(cache.map(r => r.spotify_id))
    let nextPosition = cache.length > 0 ? cache[cache.length - 1].position + 1 : 1

    // 2. Si ya tenemos suficientes para esta página, servimos directo del caché
    if (cache.length >= end) {
      const pageItems = cache.slice(start, end)
      return Response.json({
        artists: pageItems.map(({ spotify_id, name, image }) => ({ id: spotify_id, name, image })),
        hasMore: page < MAX_PAGES,
      })
    }

    // 3. Si no, vamos a buscar más — a Last.fm en tandas, resolviendo en Spotify
    //    solo los que no conocíamos ya, y en tandas pequeñas para no chocar
    //    con el rate limit.
    const token = await getSpotifyToken()
    let lastfmPage = 1
    let attempts = 0
    let lastfmExhausted = false

    while (cache.length < end && attempts < MAX_ATTEMPTS && !lastfmExhausted) {
      attempts++

      const lastfmRes = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=tag.getTopArtists&tag=${encodeURIComponent(tag)}&api_key=d98e3e57fa365982f4f7e4f729edce51&format=json&limit=${LASTFM_FETCH_SIZE}&page=${lastfmPage}`,
        { next: { revalidate: 86400 } }
      )
      const lastfmData = await lastfmRes.json()
      const candidateNames = (lastfmData.topartists?.artist || []).map(a => a.name)
      lastfmPage++

      if (candidateNames.length === 0) {
        lastfmExhausted = true
        break
      }
      if (candidateNames.length < LASTFM_FETCH_SIZE) {
        lastfmExhausted = true // esta fue la última página que Last.fm tiene
      }

      const resolved = await resolveArtistsBatched(candidateNames, token)

      const newRows = []
      for (const artist of resolved) {
        if (!artist || knownIds.has(artist.id)) continue
        knownIds.add(artist.id)
        newRows.push({
          tag,
          spotify_id: artist.id,
          name: artist.name,
          image: artist.image,
          position: nextPosition++,
        })
      }

      if (newRows.length > 0) {
        await supabaseAdmin
          .from('genre_artist_cache')
          .upsert(newRows, { onConflict: 'tag,spotify_id', ignoreDuplicates: true })
        cache = cache.concat(newRows)
      }
    }

    const pageItems = cache.slice(start, end)
    const hasMore = page < MAX_PAGES && (cache.length > end || !lastfmExhausted)

    return Response.json({
      artists: pageItems.map(({ spotify_id, name, image }) => ({ id: spotify_id, name, image })),
      hasMore,
    })
  } catch (e) {
    return Response.json({ artists: [], hasMore: false })
  }
}