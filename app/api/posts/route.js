import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin'

function buildCommentPayload(commentRows, profilesMap) {
  return (commentRows || []).map((comment) => ({
    id: comment.id,
    userId: comment.user_id,
    username: profilesMap[comment.user_id]?.username || null,
    display_name: profilesMap[comment.user_id]?.display_name || null,
    avatar_url: profilesMap[comment.user_id]?.avatar_url || null,
    text: comment.body,
    body: comment.body,
    created_at: comment.created_at,
    timestamp: comment.created_at,
  }))
}

async function getSocialForPost(postId, userId) {
  const [{ data: likeRows }, { data: commentRows }] = await Promise.all([
    supabase.from('post_likes').select('user_id').eq('post_id', postId),
    supabase.from('post_comments').select('id, user_id, body, created_at').eq('post_id', postId).order('created_at', { ascending: true }),
  ])

  const userIds = [...new Set((commentRows || []).map((c) => c.user_id).filter(Boolean))]
  const { data: profileRows } = userIds.length > 0
    ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', userIds)
    : { data: [] }

  const profilesMap = Object.fromEntries((profileRows || []).map((profile) => [profile.id, profile]))
  const likes = (likeRows || []).map((row) => row.user_id)

  return {
    likes,
    comments: buildCommentPayload(commentRows, profilesMap),
    liked_by_me: likes.includes(userId),
    like_count: likes.length,
    comment_count: (commentRows || []).length,
  }
}

async function getAlbumById(albumId) {
  if (!albumId) return null
  const { data } = await supabase.from('albums').select('album_id, title, artist, cover_url, avg_rating, total_ratings').eq('album_id', String(albumId)).single()
  return data || null
}

async function getProfileById(userId) {
  if (!userId) return null
  const { data } = await supabase.from('profiles').select('id, username, display_name, avatar_url').eq('id', userId).single()
  return data || null
}

async function buildTextPost(post, userId) {
  const [profile, album, social] = await Promise.all([
    getProfileById(post.user_id),
    getAlbumById(post.album_id),
    getSocialForPost(post.id, userId),
  ])

  return {
    id: post.id,
    user_id: post.user_id,
    body: post.body,
    album_id: post.album_id,
    created_at: post.created_at,
    type: 'text',
    profiles: profile,
    albums: album,
    likes: social.likes,
    comments: social.comments,
    respins: [],
    liked_by_me: social.liked_by_me,
    like_count: social.like_count,
    comment_count: social.comment_count,
    resspin_count: 0,
    review: null,
    metadata: {},
  }
}

async function buildReviewPost(review, userId) {
  const [profile, album, social] = await Promise.all([
    getProfileById(review.user_id),
    getAlbumById(review.album_id),
    getSocialForPost(review.id, userId),
  ])

  return {
    id: review.id,
    user_id: review.user_id,
    body: review.body,
    album_id: review.album_id,
    created_at: review.created_at,
    type: 'review',
    profiles: profile,
    albums: album,
    likes: social.likes,
    comments: social.comments,
    respins: [],
    liked_by_me: social.liked_by_me,
    like_count: social.like_count,
    comment_count: social.comment_count,
    resspin_count: 0,
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
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const tab = searchParams.get('tab') || 'global'
  const userId = searchParams.get('userId')
  const postId = searchParams.get('postId')
  const action = searchParams.get('action')

  if (action === 'comments' && postId) {
    const { data, error } = await supabase
      .from('post_comments')
      .select('id, user_id, body, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ comments: data || [] })
  }

  try {
    let postsQuery = supabase.from('posts').select('id, user_id, body, album_id, created_at').order('created_at', { ascending: false }).limit(30)

    if (tab === 'siguiendo' && userId) {
      const { data: following } = await supabase.from('follows').select('following_id').eq('follower_id', userId)
      const ids = (following || []).map((f) => f.following_id)
      if (ids.length === 0) return NextResponse.json([])
      postsQuery = postsQuery.in('user_id', [...ids, userId])
    }

    const [{ data: postsData }, { data: reviewData }] = await Promise.all([
      postsQuery,
      supabase.from('reviews').select('id, user_id, album_id, body, rating, created_at').order('created_at', { ascending: false }).limit(30),
    ])

    const [textPosts, reviewPosts] = await Promise.all([
      Promise.all((postsData || []).map((post) => buildTextPost(post, userId))),
      Promise.all((reviewData || []).map((review) => buildReviewPost(review, userId))),
    ])

    const combined = [...textPosts, ...reviewPosts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return NextResponse.json(combined)
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const payload = await request.json()
    const { userId, body, albumId, type = 'text', review, action, postId, text } = payload || {}

    if (action === 'comment' && postId && userId && text?.trim()) {
      const { data, error } = await supabase.from('post_comments').insert({ post_id: postId, user_id: userId, body: text.trim() }).select('id, user_id, body, created_at').single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ comment: data })
    }

    if (type === 'review' && review) {
      const { data, error } = await supabase.from('reviews').insert({
        user_id: userId,
        album_id: String(albumId || review.albumId || ''),
        body: review.body || body?.trim(),
        rating: review.rating || 0,
      }).select('id, user_id, album_id, body, rating, created_at').single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      const post = await buildReviewPost(data, userId)
      return NextResponse.json({ post })
    }

    if (!userId || !body?.trim()) {
      return NextResponse.json({ error: 'Faltan datos para publicar' }, { status: 400 })
    }

    const { data, error } = await supabase.from('posts').insert({ user_id: userId, body: body.trim(), album_id: albumId || null }).select('id, user_id, body, album_id, created_at').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const post = await buildTextPost(data, userId)
    return NextResponse.json({ post })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const payload = await request.json()
    const { action, postId, userId } = payload || {}

    if (!postId || !userId) {
      return NextResponse.json({ error: 'Faltan datos de interacción' }, { status: 400 })
    }

    if (action === 'like') {
  const { data: existing } = await supabase.from('post_likes').select('id').eq('user_id', userId).eq('post_id', postId).maybeSingle()

  let dbError = null
  if (existing) {
    const { error } = await supabase.from('post_likes').delete().eq('user_id', userId).eq('post_id', postId)
    dbError = error
  } else {
    const { error } = await supabase.from('post_likes').insert({ user_id: userId, post_id: postId })
    dbError = error
  }

  const { data: likes } = await supabase.from('post_likes').select('user_id').eq('post_id', postId)
  return NextResponse.json({
    post: { like_count: likes?.length || 0, liked_by_me: !existing },
    debugError: dbError ? dbError.message : null,
  })
}
if (action === 'deleteComment') {
      const { commentId } = payload
      if (!commentId) return NextResponse.json({ error: 'Falta commentId' }, { status: 400 })

      const { error } = await supabase
        .from('post_comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    if (action === 'respin') {
  const { data: existing } = await supabase.from('respins').select('id').eq('user_id', userId).eq('post_id', postId).maybeSingle()
  if (!existing) {
    await supabase.from('respins').insert({ user_id: userId, post_id: postId })
  }
  const { data: respins } = await supabase.from('respins').select('user_id').eq('post_id', postId)
  return NextResponse.json({ post: { respin_count: respins?.length || 0 } })
}

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
