'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'

// ── POST CARD ─────────────────────────────────────────────
function PostCard({ post, currentUser, profile, onDelete, onComment, onLike, onRespin, onDeleteComment }) {
  const [liked, setLiked] = useState(post.liked_by_me || false)
  const [likeCount, setLikeCount] = useState(post.like_count || 0)
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [respinned, setRespinned] = useState(Boolean(post.respin_count && post.respin_count > 0 && post.respins?.includes(currentUser?.id)))
  const [respinCount, setRespinCount] = useState(post.respin_count || 0)
  const comments = Array.isArray(post.comments) ? post.comments : []

  const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date)) / 1000
    if (diff < 60) return 'ahora'
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`
    return new Date(date).toLocaleDateString('es', { day: 'numeric', month: 'short' })
  }

  const renderRating = (rating = 0) => `${rating}/10`

  const Avatar = ({ p, size = 36 }) => (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--gold-dim)', border: '1px solid rgba(232,197,71,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Playfair Display', serif", fontSize: size * 0.4, fontWeight: 700, color: 'var(--gold)',
      overflow: 'hidden',
    }}>
      {p?.avatar_url
        ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
        : (p?.display_name || p?.username || '?')[0].toUpperCase()
      }
    </div>
  )

  const ActionButton = ({ icon, count, active, activeColor, onClick, label }) => (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
        color: active ? activeColor : 'var(--muted)',
        fontSize: 13, fontWeight: 600, fontFamily: "'Inter', sans-serif",
        padding: '4px 2px', transition: 'color 0.15s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--muted)' }}
    >
      <span aria-hidden="true" style={{ display: 'inline-flex', width: 17, height: 17, alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      <span>{count}</span>
    </button>
  )

  const handleLike = async () => {
    if (!currentUser) { window.location.href = '/login'; return }
    const optimistic = !liked
    setLiked(optimistic)
    setLikeCount((count) => optimistic ? count + 1 : Math.max(0, count - 1))
    if (onLike) await onLike(post.id)
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || !currentUser) return
    setSubmittingComment(true)
    if (onComment) await onComment(post.id, commentText.trim())
    setCommentText('')
    setSubmittingComment(false)
    setShowComments(true)
  }

  const handleRespin = async () => {
    if (!currentUser) { window.location.href = '/login'; return }
    if (respinned) return
    setRespinned(true)
    setRespinCount((count) => count + 1)
    if (onRespin) await onRespin(post)
  }

  const review = post.type === 'review' ? (post.review || post.metadata?.review || null) : null
  const reviewText = review?.body || post.body || ''
  const reviewRating = review?.rating || 0
  const albumMeta = review?.album || post.albums || null
  const albumTitle = review?.albumTitle || albumMeta?.title || null
  const albumArtist = review?.albumArtist || albumMeta?.artist || null
  const coverUrl = review?.coverUrl || albumMeta?.cover_url || null
  const albumGenre = albumMeta?.genre || null
  const albumYear = albumMeta?.release_year || null

  return (
    <article id={`post-${post.id}`} className="post-card" style={{ borderBottom: '1px solid var(--border)', padding: '32px 0' }}>

      {/* Autor */}
      <div className="post-author" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <Link href={`/profile/${post.profiles?.username}`}><Avatar p={post.profiles} /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link href={`/profile/${post.profiles?.username}`} style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
            {post.profiles?.display_name || post.profiles?.username}
          </Link>
          <span style={{ fontSize: 13, color: 'var(--muted)', marginLeft: 6 }}>@{post.profiles?.username} · {timeAgo(post.created_at)}</span>
        </div>
        {currentUser?.id === post.user_id && (
          <button onClick={() => onDelete(post.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, opacity: 0.4, padding: 0 }}>×</button>
        )}
      </div>

      {/* Contenido: album grande + reseña, o solo texto */}
      {post.type === 'review' && review ? (
        <div className="post-review-block" style={{ display: 'flex', gap: 24, marginBottom: 18 }}>
          {coverUrl && (
            <Link href={`/album/${post.album_id}`} style={{ flexShrink: 0 }}>
              <img className="post-cover" src={coverUrl} alt="" style={{ width: 150, height: 150, borderRadius: 8, objectFit: 'cover', boxShadow: '0 12px 32px rgba(0,0,0,0.5)' }} referrerPolicy="no-referrer" />
            </Link>
          )}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Link href={`/album/${post.album_id}`} className="post-album-title" style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', lineHeight: 1.2, marginBottom: 4 }}>
  {albumTitle || 'Álbum'}
</Link>
<div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 4 }}>{albumArtist}</div>
{(albumGenre || albumYear) && (
  <div style={{ fontSize: 11, color: 'var(--muted-light)', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
    {[albumGenre, albumYear].filter(Boolean).join(' · ')}
  </div>
)}
<div style={{ color: 'var(--gold)', fontSize: 16, letterSpacing: 2 }}>{renderRating(reviewRating)}</div>
          </div>
        </div>
      ) : (
        post.type !== 'review' && post.albums && (
          <Link href={`/album/${post.album_id}`}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              {post.albums.cover_url && <img src={post.albums.cover_url} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }} referrerPolicy="no-referrer" />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{post.albums.title}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{post.albums.artist}</div>
              </div>
            </div>
          </Link>
        )
      )}

      <p className="post-body" style={{
        fontFamily: "'Inter', sans-serif",
        fontStyle: 'normal',
        fontSize: 15,
        color: 'var(--text)', lineHeight: 1.7, margin: '0 0 20px', maxWidth: 620,
      }}>{reviewText || post.body}</p>

      {/* Acciones */}
      <div className="post-actions" style={{ display: 'flex', alignItems: 'center', gap: 22 }}></div>

      {/* Acciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <ActionButton
          label="Comentarios" count={comments.length}
          active={showComments} activeColor="var(--gold)"
          onClick={() => setShowComments(!showComments)}
          icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 6h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3V7a1 1 0 0 1 1-1Z" /></svg>}
        />
        <ActionButton
          label="Me gusta" count={likeCount}
          active={liked} activeColor="#e85d75"
          onClick={handleLike}
          icon={<svg viewBox="0 0 24 24" width="16" height="16" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20s-6.5-4.35-8.3-8.1A4.9 4.9 0 0 1 12 6.2a4.9 4.9 0 0 1 8.3 5.7C18.5 15.65 12 20 12 20Z" /></svg>}
        />
        <ActionButton
          label="Re-spin" count={respinCount}
          active={respinned} activeColor="var(--gold)"
          onClick={handleRespin}
          icon={<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M17 7h-5a4 4 0 1 0 0 8h2" /><path d="m14 10 3-3-3-3" /><path d="M7 17h5a4 4 0 1 0 0-8h-2" /><path d="m10 14-3 3 3 3" /></svg>}
        />
        {post.album_id && (
          <Link href={`/album/${post.album_id}`} style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>Ver álbum →</Link>
        )}
      </div>

      {showComments && (
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 560 }}>
          {comments.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Sin comentarios aún</div>}
          {comments.map((c, idx) => (
  <div key={`${c.userId || c.user_id || 'comment'}-${idx}`} style={{ display: 'flex', gap: 8 }}>
    <Avatar p={{ avatar_url: c.avatar_url, username: c.username, display_name: c.display_name }} size={26} />
    <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 10, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>@{c.username || 'usuario'}</span>
        <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0', lineHeight: 1.5 }}>{c.text || c.body}</p>
      </div>
      {currentUser?.id === (c.userId || c.user_id) && (
        <button
          onClick={() => onDeleteComment && onDeleteComment(post.id, c.id)}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, opacity: 0.5, padding: 0, flexShrink: 0 }}
        >×</button>
      )}
    </div>
  </div>
))}
          {currentUser && (
            <form onSubmit={submitComment} style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <Avatar p={profile || currentUser} size={26} />
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                placeholder="Responde rápido..." style={{
                  flex: 1, padding: '7px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 20, color: 'var(--text)', fontSize: 13, fontFamily: "'Inter', sans-serif", outline: 'none',
                }} />
              <button type="submit" disabled={!commentText.trim() || submittingComment} style={{
                background: commentText.trim() ? 'var(--gold)' : 'var(--border)', border: 'none', borderRadius: 20,
                padding: '7px 14px', color: commentText.trim() ? '#000' : 'var(--muted)', fontSize: 12, fontWeight: 700,
                cursor: commentText.trim() ? 'pointer' : 'not-allowed',
              }}>→</button>
            </form>
          )}
        </div>
      )}
    </article>
  )
}

// ── CREATE POST ───────────────────────────────────────────
function CreatePost({ currentUser, profile, onPost, prefillAlbum }) {
  const [body, setBody] = useState('')
  const [album, setAlbum] = useState(prefillAlbum || null)
  const [albumSearch, setAlbumSearch] = useState('')
  const [albumResults, setAlbumResults] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (prefillAlbum) setAlbum(prefillAlbum) }, [prefillAlbum])

  useEffect(() => {
    if (!albumSearch.trim()) { setAlbumResults([]); return }
    const t = setTimeout(async () => {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(albumSearch)}&entity=album&limit=5`)
      const data = await res.json()
      setAlbumResults((data.results || []).map(a => ({
        id: String(a.collectionId), name: a.collectionName,
        artist: a.artistName, image: (a.artworkUrl100 || '').replace('100x100bb', '300x300bb'),
      })))
    }, 350)
    return () => clearTimeout(t)
  }, [albumSearch])

  const handleSubmit = async () => {
    if (!body.trim() || !currentUser) return
    setSubmitting(true)
    if (album) {
      await supabase.from('albums').upsert({
        album_id: album.id, title: album.name,
        artist: album.artist, cover_url: album.image,
        genre: album.genre || null,
        release_year: album.year && album.year !== '—' ? parseInt(album.year) : null,
      }, { onConflict: 'album_id' })
    }

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        body: body.trim(),
        albumId: album?.id || null,
        type: 'text',
      }),
    })
    const payload = await res.json()
    if (payload?.post) {
      onPost({ ...payload.post, like_count: payload.post.like_count || 0, comment_count: payload.post.comment_count || 0, liked_by_me: false })
      setBody(''); setAlbum(null); setAlbumSearch('')
    }
    setSubmitting(false)
  }

  const Avatar = ({ size = 40 }) => (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--gold-dim)', border: '1px solid rgba(232,197,71,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Playfair Display', serif", fontSize: size * 0.35, fontWeight: 700, color: 'var(--gold)',
      overflow: 'hidden',
    }}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
        : (profile?.display_name || profile?.username || '?')[0].toUpperCase()
      }
    </div>
  )

  if (!currentUser) return (
    <div style={{ padding: '24px 0', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 12 }}>Inicia sesión para publicar</div>
      <Link href="/login" className="btn-gold-sm">Iniciar sesión</Link>
    </div>
  )

  return (
    <div style={{ padding: '24px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link href={`/profile/${profile?.username}`}><Avatar /></Link>
        <div style={{ flex: 1 }}>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="¿Qué estás escuchando?"
            rows={2}
            style={{
              width: '100%', padding: '8px 0', background: 'transparent', border: 'none',
              color: 'var(--text)', fontSize: 17, fontFamily: "'Inter', sans-serif",
              resize: 'none', outline: 'none', lineHeight: 1.6,
            }}
          />

          {album ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid rgba(232,197,71,0.2)', borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
              <img src={album.image} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} referrerPolicy="no-referrer" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{album.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{album.artist}</div>
              </div>
              <button onClick={() => setAlbum(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
          ) : (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input value={albumSearch} onChange={e => setAlbumSearch(e.target.value)}
                placeholder="🎵 Adjuntar álbum..."
                style={{
                  width: '100%', padding: '8px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 20, color: 'var(--text)', fontSize: 13, fontFamily: "'Inter', sans-serif", outline: 'none',
                }}
                onBlur={() => setTimeout(() => setAlbumResults([]), 200)}
              />
              {albumResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#181818', border: '1px solid var(--border)', borderRadius: 12, marginTop: 4, overflow: 'hidden', boxShadow: '0 12px 32px rgba(0,0,0,0.7)' }}>
                  {albumResults.map(a => (
                    <div key={a.id} onClick={() => { setAlbum(a); setAlbumSearch(''); setAlbumResults([]) }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#222'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <img src={a.image} alt="" style={{ width: 36, height: 36, borderRadius: 5, objectFit: 'cover' }} referrerPolicy="no-referrer" />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{a.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: 12, color: body.length > 400 ? '#f87171' : 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>{body.length}/500</span>
            <button onClick={handleSubmit} disabled={!body.trim() || submitting} style={{
              background: body.trim() ? 'var(--gold)' : 'rgba(232,197,71,0.3)', border: 'none', borderRadius: 100,
              padding: '9px 24px', color: body.trim() ? '#000' : 'var(--muted)', fontWeight: 700, fontSize: 14,
              cursor: body.trim() ? 'pointer' : 'not-allowed', fontFamily: "'Inter', sans-serif",
            }}>{submitting ? 'Publicando...' : 'Publicar'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── MAIN FEED ─────────────────────────────────────────────
export default function FeedPage() {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('global')
  const [prefillAlbum, setPrefillAlbum] = useState(null)
  const [topAlbums, setTopAlbums] = useState([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const albumId = params.get('album_id')
    if (albumId) {
      setPrefillAlbum({
        id: albumId, name: params.get('album_name'),
        artist: params.get('album_artist'), image: params.get('album_image'),
      })
      window.history.replaceState({}, '', '/feed')
    }
    loadSidebar()
  }, [])
  useEffect(() => {
    if (posts.length === 0) return
    const hash = window.location.hash
    if (hash?.startsWith('#post-')) {
      const el = document.getElementById(hash.slice(1))
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.style.transition = 'background 0.3s'
        el.style.background = 'rgba(232,197,71,0.08)'
        setTimeout(() => { el.style.background = 'transparent' }, 1800)
      }
    }
  }, [posts])

  useEffect(() => { loadPosts() }, [tab, user])

  async function loadSidebar() {
    const { data: albums } = await supabase
      .from('albums')
      .select('album_id, title, artist, cover_url, avg_rating, total_ratings')
      .not('avg_rating', 'is', null)
      .order('total_ratings', { ascending: false })
      .limit(8)
    setTopAlbums(albums || [])
  }

  async function loadPosts() {
    setLoading(true)
    const params = new URLSearchParams({ tab, userId: user?.id || '' })
    const res = await fetch(`/api/posts?${params.toString()}`)
    const data = await res.json()
    const normalized = (data || []).map((post) => ({
      ...post,
      liked_by_me: post.likes?.includes(user?.id) || post.liked_by_me || false,
      like_count: post.like_count || post.likes?.length || 0,
      comment_count: post.comment_count || post.comments?.length || 0,
      resspin_count: post.respin_count || post.respins?.length || 0,
    }))
    setPosts(normalized)
    setLoading(false)
  }

  const handleComment = async (postId, text) => {
    if (!user) return
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'comment', postId, userId: user.id, text }),
    })
    const payload = await res.json()
    if (payload?.post) {
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...payload.post, comments: payload.post.comments || p.comments || [] } : p))
    }
  }
  const handleDeleteComment = async (postId, commentId) => {
    if (!user) return
    const res = await fetch('/api/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteComment', postId, userId: user.id, commentId }),
    })
    const payload = await res.json()
    if (payload?.ok) {
      setPosts(prev => prev.map(p => p.id === postId
        ? { ...p, comments: p.comments.filter(c => c.id !== commentId), comment_count: Math.max(0, (p.comment_count || 1) - 1) }
        : p))
    }
  }

  const handleLike = async (postId) => {
    if (!user) return
    const res = await fetch('/api/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'like', postId, userId: user.id }),
    })
    const payload = await res.json()
    if (payload?.post) {
      setPosts(prev => prev.map(p => p.id === postId ? {
        ...p, ...payload.post,
        liked_by_me: payload.post.liked_by_me,
        like_count: payload.post.like_count || 0,
      } : p))
    }
  }

  const handleRespin = async (post) => {
    if (!user || !profile) return
    const res = await fetch('/api/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'respin', postId: post.id, userId: user.id }),
    })
    const payload = await res.json()
    if (payload?.post) {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, resspin_count: payload.post.respin_count || 0 } : p))
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* NAV — SIN CAMBIOS */}
      <nav className="feed-nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 48px', background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 12, color: '#000' }}>W</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Wax</span>
        </Link>
        <div className="feed-nav-links" style={{ display: 'flex', gap: 28 }}>
          {[{ label: 'Álbumes', href: '/albums' }, { label: 'Feed', href: '/feed' }, { label: 'Amigos', href: '/friends' }, { label: 'Quiz', href: '/quiz' }].map(({ label, href }) => (
            <Link key={href} href={href} className="nav-link" style={{ color: href === '/feed' ? 'var(--text)' : undefined }}>{label}</Link>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {user && profile ? (
            <Link href={`/profile/${profile.username}`} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 100, padding: '6px 12px 6px 6px' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid rgba(232,197,71,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: 11, fontWeight: 700, color: 'var(--gold)', overflow: 'hidden' }}>
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : (profile.display_name || profile.username || '?')[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>@{profile.username}</span>
            </Link>
          ) : (
            <>
              <Link href="/login" className="nav-link" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>Iniciar sesión</Link>
              <Link href="/register" className="btn-gold-sm">Crear cuenta</Link>
            </>
          )}
        </div>
      </nav>

      {/* LAYOUT 2 COLUMNAS: contenido + top álbumes */}
      <div className="feed-layout" style={{ maxWidth: 900, margin: '0 auto', padding: '80px 24px 60px', display: 'grid', gridTemplateColumns: '1fr 260px', gap: 56, alignItems: 'start' }}>

        {/* ── CONTENIDO ── */}
        <div className="feed-center">
          <div style={{ marginBottom: 4 }}>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, color: 'var(--text)' }}>Feed</h1>
          </div>
          <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
            {[{ id: 'global', label: 'Global' }, { id: 'siguiendo', label: 'Siguiendo' }].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '14px 0', fontSize: 14, fontWeight: 600,
                color: tab === t.id ? 'var(--text)' : 'var(--muted)',
                borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
                fontFamily: "'Inter', sans-serif", transition: 'color 0.2s',
              }}>{t.label}</button>
            ))}
          </div>

          <CreatePost currentUser={user} profile={profile} onPost={p => setPosts(prev => [p, ...prev])} prefillAlbum={prefillAlbum} />

          {loading ? (
            <div style={{ paddingTop: 24 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ height: 160, borderRadius: 8, background: '#111', marginBottom: 20 }} className="skeleton" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>
                {tab === 'siguiendo' ? 'Sigue a alguien para ver su feed' : 'Sin posts aún'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>Sé el primero en compartir algo</div>
            </div>
          ) : (
            posts.map(post => (
  <PostCard key={post.id} post={post} currentUser={user} profile={profile}
    onDelete={id => setPosts(p => p.filter(post => post.id !== id))}
    onComment={handleComment}
    onLike={handleLike}
    onRespin={handleRespin}
    onDeleteComment={handleDeleteComment} />
))
          )}
        </div>

        {/* ── TOP ÁLBUMES ── */}
        <div className="feed-sidebar-right" style={{ position: 'sticky', top: 96 }}>
          {topAlbums.length > 0 && (
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 14 }}>
                Top álbumes
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {topAlbums.map((album, i) => (
                  <Link key={album.album_id} href={`/album/${album.album_id}`}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 6px', borderRadius: 8, transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--muted)', width: 14, flexShrink: 0 }}>{i + 1}</span>
                      {album.cover_url && <img src={album.cover_url} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} referrerPolicy="no-referrer" />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{album.artist}</div>
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--gold)', flexShrink: 0 }}>★{Number(album.avg_rating).toFixed(1)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--muted-light)', lineHeight: 1.8, marginTop: 32 }}>
            <Link href="/privacy" style={{ color: 'var(--muted-light)', marginRight: 8 }}>Privacidad</Link>
            <Link href="/terms" style={{ color: 'var(--muted-light)', marginRight: 8 }}>Términos</Link>
            <br />© 2026 Wax
          </div>
        </div>

      </div>
      <style jsx global>{`
        @media (max-width: 768px) {
          .feed-layout {
            grid-template-columns: 1fr !important;
            padding: 72px 16px 40px !important;
            gap: 32px !important;
          }
          .feed-sidebar-right {
            display: none !important;
          }
          .feed-nav {
            padding: 12px 16px !important;
          }
          .feed-nav-links {
            gap: 16px !important;
          }
          .feed-nav-links a {
            font-size: 12px !important;
          }
          .post-card {
            padding: 20px 0 !important;
          }
          .post-author img,
          .post-author > div > div {
            width: 30px !important;
            height: 30px !important;
          }
          .post-review-block {
            gap: 14px !important;
          }
          .post-cover {
            width: 84px !important;
            height: 84px !important;
          }
          .post-album-title {
            font-size: 18px !important;
          }
          .post-body {
            font-size: 13.5px !important;
            line-height: 1.55 !important;
            margin-bottom: 14px !important;
          }
          .post-actions {
            gap: 16px !important;
          }
          .post-actions button span {
            font-size: 12px !important;
          }
        }
      `}</style>
    </div>
  )
}