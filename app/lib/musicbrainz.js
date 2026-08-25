const MB_HEADERS = {
  'User-Agent': 'Wax-Web/1.0 (https://wax-web.vercel.app)',
}

async function mbFetch(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, { headers: MB_HEADERS, next: { revalidate: 86400 } })
      if (res.ok) return res.json()
      if (res.status === 503 && i < retries) {
        await new Promise(r => setTimeout(r, 500 * (i + 1)))
        continue
      }
      return null
    } catch {
      if (i < retries) {
        await new Promise(r => setTimeout(r, 500 * (i + 1)))
        continue
      }
      return null
    }
  }
  return null
}

async function fetchWikiSummary(name) {
  const langs = ['es', 'en']
  for (const lang of langs) {
    try {
      const res = await fetch(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`,
        { headers: { 'User-Agent': 'Wax-Web/1.0' }, next: { revalidate: 86400 } }
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
    } catch { }
  }
  return null
}
async function tryWikiPhoto(query, lang = 'en') {
  try {
    const searchRes = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&srlimit=3`,
      { headers: { 'User-Agent': 'Wax-Web/1.0' }, next: { revalidate: 86400 } }
    )
    const searchData = await searchRes.json()
    const results = searchData?.query?.search || []

    for (const result of results) {
      const res = await fetch(
        `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(result.title)}`,
        { headers: { 'User-Agent': 'Wax-Web/1.0' }, next: { revalidate: 86400 } }
      )
      if (!res.ok) continue
      const data = await res.json()
      if (data.thumbnail?.source && data.type !== 'disambiguation') {
        return data.thumbnail.source
      }
    }
    return null
  } catch {
    return null
  }
}

export async function getMemberPhoto(memberName, bandName) {
  // Intento 1: nombre + banda en inglés (ej. "j-hope BTS")
  const photo1 = await tryWikiPhoto(`${memberName} ${bandName}`, 'en')
  if (photo1) return photo1

  // Intento 2: solo el nombre en inglés (ej. "j-hope")
  const photo2 = await tryWikiPhoto(memberName, 'en')
  if (photo2) return photo2

  // Intento 3: nombre + banda en español
  const photo3 = await tryWikiPhoto(`${memberName} ${bandName}`, 'es')
  if (photo3) return photo3

  return null
}

function classifyLink(url) {
  const u = url.toLowerCase()
  if (u.includes('instagram.com')) return { label: 'Instagram', icon: 'instagram' }
  if (u.includes('twitter.com') || u.includes('x.com')) return { label: 'X / Twitter', icon: 'twitter' }
  if (u.includes('facebook.com')) return { label: 'Facebook', icon: 'facebook' }
  if (u.includes('youtube.com')) return { label: 'YouTube', icon: 'youtube' }
  if (u.includes('tiktok.com')) return { label: 'TikTok', icon: 'tiktok' }
  if (u.includes('bandcamp.com')) return { label: 'Bandcamp', icon: 'bandcamp' }
  if (u.includes('soundcloud.com')) return { label: 'SoundCloud', icon: 'soundcloud' }
  return { label: 'Sitio oficial', icon: 'globe' }
}

export async function getArtistMusicbrainzInfo(name) {
  if (!name || !name.trim()) return null

  try {
    const searchData = await mbFetch(
      `https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(`artist:"${name}"`)}&fmt=json&limit=1`
    )
    const artist = searchData?.artists?.[0]
    if (!artist) return null

    const isGroup = artist.type === 'Group' || artist.type === 'Orchestra' || artist.type === 'Choir'
    const isPerson = artist.type === 'Person'

    let members = []
    let otherMembers = []
    let realName = null

    const [comboData, wiki] = await Promise.all([
      mbFetch(`https://musicbrainz.org/ws/2/artist/${artist.id}?inc=artist-rels+url-rels+tags+aliases&fmt=json`),
      fetchWikiSummary(artist.name),
    ])

    if (isGroup) {
      const relations = comboData?.relations || []
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
            } catch { }
          }

          const attrs = r.attributes || []
          const isSecondary = attrs.some(a =>
            ['touring', 'guest', 'additional', 'session'].includes(a.toLowerCase())
          )

          return { name: displayName, secondary: isSecondary }
        })
      )

      const mainMembers = resolved.filter(m => !m.secondary)
      otherMembers = resolved.filter(m => m.secondary)

      members = await Promise.all(
        mainMembers.map(async (m) => ({
          ...m,
          photo: await getMemberPhoto(m.name, artist.name),
        }))
      )
    } else if (isPerson) {
      const legalAlias = (comboData?.aliases || []).find(a => a.type === 'Legal name')
      if (legalAlias && legalAlias.name !== artist.name) {
        realName = legalAlias.name
      }
    }

    const links = (comboData?.relations || [])
      .filter(r => r.url?.resource)
      .map(r => {
        const meta = classifyLink(r.url.resource)
        return { url: r.url.resource, ...meta }
      })
      .filter((v, i, arr) => arr.findIndex(x => x.icon === v.icon) === i)
      .slice(0, 6)

    const tags = (comboData?.tags || [])
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 8)
      .map(t => t.name)

    return {
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
      links,
      tags,
    }
  } catch {
    return null
  }
}