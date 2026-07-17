import { NextResponse } from 'next/server'

const MB_HEADERS = {
  'User-Agent': 'Wax-Web/1.0 (https://wax-web.vercel.app)',
}

async function mbFetch(url) {
  const res = await fetch(url, { headers: MB_HEADERS })
  if (!res.ok) return null
  return res.json()
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')

  if (!name || !name.trim()) {
    return NextResponse.json({ result: null })
  }

  try {
    // Paso 1: buscar el artista por nombre
    const searchData = await mbFetch(
      `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(`artist:"${name}"`)}&fmt=json&limit=1`
    )
    const artist = searchData?.artists?.[0]

    if (!artist) {
      return NextResponse.json({ result: null })
    }

    const isGroup = artist.type === 'Group' || artist.type === 'Orchestra' || artist.type === 'Choir'
    const isPerson = artist.type === 'Person'

    let members = []
    let realName = null

    if (isGroup) {
      // Paso 2a: traer integrantes de la banda
      const relData = await mbFetch(
        `https://musicbrainz.org/ws/2/artist/${artist.id}?inc=artist-rels&fmt=json`
      )
      const relations = relData?.relations || []
      members = relations
        .filter(r => r.type === 'member of band' && r.artist)
        .map(r => ({
          name: r.artist.name,
          active: !r.ended,
          instruments: r.attributes || [],
        }))
    } else if (isPerson) {
      // Paso 2b: buscar nombre legal si el artista usa nombre artístico
      const artistData = await mbFetch(
        `https://musicbrainz.org/ws/2/artist/${artist.id}?inc=aliases&fmt=json`
      )
      const legalAlias = (artistData?.aliases || []).find(a => a.type === 'Legal name')
      if (legalAlias && legalAlias.name !== artist.name) {
        realName = legalAlias.name
      }
    }

    return NextResponse.json({
      result: {
        name: artist.name,
        type: artist.type || null,
        disambiguation: artist.disambiguation || null,
        country: artist.country || null,
        realName,
        members,
      },
    })
  } catch (err) {
    return NextResponse.json({ result: null, error: 'fetch_failed' }, { status: 500 })
  }
}