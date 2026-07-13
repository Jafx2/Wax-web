import { NextResponse } from 'next/server'

const COUNTRIES = ['US', 'MX', 'AR', 'CO', 'ES']

function isSingleOrEP(a) {
  const name = a.collectionName || ''
  return (
    a.trackCount <= 1 ||
    /-\s*single$/i.test(name) ||
    /-\s*ep$/i.test(name)
  )
}

function dedupeAndMap(rawResults) {
  const seen = new Set()
  return rawResults
    .filter(a => {
      if (!a.collectionId || seen.has(a.collectionId)) return false
      if (isSingleOrEP(a)) return false
      seen.add(a.collectionId)
      return true
    })
    .map(a => ({
      id: a.collectionId,
      name: a.collectionName,
      artist: a.artistName,
      image: (a.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
      year: a.releaseDate ? new Date(a.releaseDate).getFullYear() : '—',
      trackCount: a.trackCount || 0,
      genre: a.primaryGenreName || '',
    }))
}

async function searchArtists(term, country) {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=musicArtist&limit=5&country=${country}`
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.results || []
  } catch {
    return []
  }
}

async function getArtistAlbums(artistId, country) {
  try {
    const res = await fetch(
      `https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=200&country=${country}`
    )
    if (!res.ok) return []
    const data = await res.json()
    // El primer resultado del lookup es el artista mismo, no un álbum
    return (data.results || []).filter(r => r.wrapperType === 'collection')
  } catch {
    return []
  }
}

async function directAlbumSearch(term, country) {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=200&country=${country}`
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.results || []
  } catch {
    return []
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const term = searchParams.get('term')

  if (!term || !term.trim()) {
    return NextResponse.json({ results: [] })
  }

  try {
    // Paso 1: buscar artistas que coincidan con el término, en varios países
    const artistResultsByCountry = await Promise.all(
      COUNTRIES.map(country => searchArtists(term, country))
    )
    const artists = artistResultsByCountry.flat()

    // Quitar artistas duplicados por artistId
    const seenArtistIds = new Set()
    const uniqueArtists = artists.filter(a => {
      if (!a.artistId || seenArtistIds.has(a.artistId)) return false
      seenArtistIds.add(a.artistId)
      return true
    }).slice(0, 3) // top 3 artistas coincidentes, por si hay ambigüedad de nombre

    let allAlbums = []

    if (uniqueArtists.length > 0) {
      // Paso 2: traer la discografía completa de cada artista encontrado
      const albumsByArtist = await Promise.all(
        uniqueArtists.flatMap(artist =>
          COUNTRIES.map(country => getArtistAlbums(artist.artistId, country))
        )
      )
      allAlbums = albumsByArtist.flat()
    }

    // Respaldo: si no se encontró ningún artista, hacer búsqueda directa de álbumes
    if (allAlbums.length === 0) {
      const directResultsByCountry = await Promise.all(
        COUNTRIES.map(country => directAlbumSearch(term, country))
      )
      allAlbums = directResultsByCountry.flat()
    }

    const albums = dedupeAndMap(allAlbums).slice(0, 40)

    return NextResponse.json({ results: albums })
  } catch (err) {
    return NextResponse.json({ results: [], error: 'fetch_failed' }, { status: 500 })
  }
}