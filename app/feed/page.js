import { supabaseAdmin } from '../lib/supabaseAdmin'
import FeedClient from './FeedClient'

async function getInitialPosts() {
  const [{ data: postsData }, { data: reviewData }] = await Promise.all([
    supabaseAdmin
      .from('posts')
      .select('id, user_id, body, album_id, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
    supabaseAdmin
      .from('reviews')
      .select('id, user_id, album_id, body, rating, created_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  // Perfiles
  const userIds = [...new Set([
    ...(postsData || []).map(p => p.user_id),
    ...(reviewData || []).map(r => r.user_id),
  ].filter(Boolean))]

  const { data: profileRows } = userIds.length > 0
    ? await supabaseAdmin.from('profiles').select('id, username, display_name, avatar_url').in('id', userIds)
    : { data: [] }
  const profilesMap = Object.fromEntries((profileRows || []).map(p => [p.id, p]))

  // Álbumes
  const albumIds = [...new Set([
    ...(postsData || []).map(p => p.album_id),
    ...(reviewData || []).map(r => r.album_id),
  ].filter(Boolean))]

  const { data: albumRows } = albumIds.length > 0
    ? await supabaseAdmin.from('albums').select('album_id, title, artist, cover_url, avg_rating, total_ratings, genre, release_year').in('album_id', albumIds)
    : { data: [] }
  const albumsMap = Object.fromEntries((albumRows || []).map(a => [a.album_id, a]))

  const textPosts = (postsData || []).map(post => ({
    id: post.id,
    user_id: post.user_id,
    body: post.body,
    album_id: post.album_id,
    created_at: post.created_at,
    type: 'text',
    profiles: profilesMap[post.user_id] || null,
    albums: albumsMap[post.album_id] || null,
    likes: [],
    comments: [],
    respins: [],
    liked_by_me: false,
    like_count: 0,
    comment_count: 0,
    respin_count: 0,
    review: null,
    metadata: {},
  }))

  const reviewPosts = (reviewData || []).map(review => {
    const album = albumsMap[review.album_id] || null
    return {
      id: review.id,
      user_id: review.user_id,
      body: review.body,
      album_id: review.album_id,
      created_at: review.created_at,
      type: 'review',
      profiles: profilesMap[review.user_id] || null,
      albums: album,
      likes: [],
      comments: [],
      respins: [],
      liked_by_me: false,
      like_count: 0,
      comment_count: 0,
      respin_count: 0,
      review: {
        body: review.body,
        rating: review.rating,
        albumTitle: album?.title || null,
        albumArtist: album?.artist || null,
        albumId: review.album_id,
        coverUrl: album?.cover_url || null,
      },
      metadata: {},
    }
  })

  return [...textPosts, ...reviewPosts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

async function getTopAlbums() {
  const { data } = await supabaseAdmin
    .from('albums')
    .select('album_id, title, artist, cover_url, avg_rating, total_ratings')
    .not('avg_rating', 'is', null)
    .order('total_ratings', { ascending: false })
    .limit(8)
  return data || []
}

export default async function FeedPage() {
  const [initialPosts, topAlbums] = await Promise.all([
    getInitialPosts(),
    getTopAlbums(),
  ])

  return <FeedClient initialPosts={initialPosts} topAlbums={topAlbums} />
}