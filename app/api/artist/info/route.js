import { NextResponse } from 'next/server'

const MB_HEADERS = {
  'User-Agent': 'Wax-Web/1.0 (https://wax-web.vercel.app)',
}

async function mbFetch(url) {
  const res = await fetch(url, { headers: MB_HEADERS })
  if (!res.ok) return null
  return res.json()
}

async function fetchWikiSummary(name) {
  const langs = ['es', 'en']
  for (const lang of langs) {
    try {
      const res = await fetch(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
        { headers: { 'User-Agent': 'Wax-Web/1.0' } }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (data.extract && data.type !== 'disambiguation') {
        return {
          extract: data.extract,
          url: data.content_urls?.desktop?.page || null,
          lang,
        }
      }
    } catch {}
  }
  return null
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
    let otherMembers = []
    let realName = null

    if (isGroup) {
      const relData = await mbFetch(
        `https://musicbrainz.org/ws/2/artist/${artist.id}?inc=artist-rels&fmt=json`
      )
      const relations = relData?.relations || []
      const bandRelations = relations.filter(r => r.type === 'member of band' && r.artist)

      const seenIds = new Set()
      const uniqueRelations = bandRelations.filter(r => {
        if (seenIds.has(r.artist.id)) return false
        seenIds.add(r.artist.id)
        return true
      })

      const resolved = await Promise.all(
        uniqueRelations.map(async (r) => {
          let displayName = r.artist.name
          const isAlreadyLatin = /^[A-Za-z0-9\s.,'&()-]+$/.test(r.artist.name || '')

          if (!isAlreadyLatin) {
            try {
              const memberData = await mbFetch(
                `https://musicbrainz.org/ws/2/artist/${r.artist.id}?inc=aliases&fmt=json`
              )
              const latinAlias = (memberData?.aliases || []).find(
                a => a.primary && /^[A-Za-z0-9\s.,'&()-]+$/.test(a.name || '')
              )
              if (latinAlias) displayName = latinAlias.name
            } catch {}
          }

          const attrs = r.attributes || []
          const isSecondary = attrs.some(a =>
            ['touring', 'guest', 'additional', 'session'].includes(a.toLowerCase())
          )

          return { name: displayName, secondary: isSecondary }
        })
      )

      members = resolved.filter(m => !m.secondary)
      otherMembers = resolved.filter(m => m.secondary)
    } else if (isPerson) {
      const artistData = await mbFetch(
        `https://musicbrainz.org/ws/2/artist/${artist.id}?inc=aliases&fmt=json`
      )
      const legalAlias = (artistData?.aliases || []).find(a => a.type === 'Legal name')
      if (legalAlias && legalAlias.name !== artist.name) {
        realName = legalAlias.name
      }
    }

    // Paso 3: biografía de Wikipedia
    const wiki = await fetchWikiSummary(artist.name)

    return NextResponse.json({
      result: {
        name: artist.name,
        type: artist.type || null,
        disambiguation: artist.disambiguation || null,
        country: artist.country || null,
        beginDate: artist['life-span']?.begin || null,
        endDate: artist['life-span']?.end || null,
        ended: artist['life-span']?.ended || false,
        realName,
        members,
        otherMembers,
        wiki,
      },
    })
  } catch (err) {
    return NextResponse.json({ result: null, error: 'fetch_failed' }, { status: 500 })
  }
}