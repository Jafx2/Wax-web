import { supabaseAdmin } from './lib/supabaseAdmin'

export default async function sitemap() {
  const baseUrl = 'https://wax-web.vercel.app'

  const staticRoutes = [
    '',
    '/albums',
    '/feed',
    '/friends',
    '/quiz',
    '/login',
    '/register',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: route === '' ? 1.0 : 0.8,
  }))

  try {
    const [{ data: topAlbums }, { data: profiles }, { data: genres }] = await Promise.all([
      supabaseAdmin
        .from('albums')
        .select('album_id, total_ratings')
        .not('total_ratings', 'is', null)
        .order('total_ratings', { ascending: false })
        .limit(100),
      supabaseAdmin
        .from('profiles')
        .select('username, created_at')
        .limit(100),
      supabaseAdmin
        .from('genre_artist_cache')
        .select('tag')
        .limit(50),
    ])

    const albumRoutes = (topAlbums || []).map((a) => ({
      url: `${baseUrl}/album/${a.album_id}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    }))

    const profileRoutes = (profiles || []).map((p) => ({
      url: `${baseUrl}/profile/${p.username}`,
      lastModified: p.created_at ? new Date(p.created_at) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }))

    const uniqueTags = [...new Set((genres || []).map((g) => g.tag).filter(Boolean))]
    const genreRoutes = uniqueTags.map((tag) => ({
      url: `${baseUrl}/genre/${encodeURIComponent(tag)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }))

    return [...staticRoutes, ...albumRoutes, ...profileRoutes, ...genreRoutes]
  } catch {
    return staticRoutes
  }
}