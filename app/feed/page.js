'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'

// ── POST CARD ─────────────────────────────────────────────
function PostCard({ post, currentUser, profile, onDelete, onComment, onLike, onRespin, onToggleComments }) {
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

  const renderStars = (rating = 0) => {
    const fullStars = Math.round(rating / 2)
    return '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars)
  }

  const truncate = (text = '', max = 280) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

  const ActionButton = ({ icon, count, active, activeColor, onClick, label }) => (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--border)',
        borderRadius: 999,
        cursor: 'pointer',
        padding: '6px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        color: active ? activeColor : 'var(--muted)',
        fontSize: 12,
        fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = active ? 'rgba(232,197,71,0.35)' : 'rgba(255,255,255,0.12)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
      }}
    >
      <span aria-hidden="true" style={{ display: 'inline-flex', width: 15, height: 15, alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
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

  const handleCommentToggle = () => {
    const next = !showComments
    setShowComments(next)
    if (onToggleComments) onToggleComments(post.id, next)
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

  const Avatar = ({ p, size = 40 }) => (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'var(--gold-dim)', border: '1px solid rgba(232,197,71,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Playfair Display', serif", fontSize: size * 0.35, fontWeight: 700, color: 'var(--gold)',
      overflow: 'hidden',
    }}>
      {p?.avatar_url
        ? <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
        : (p?.display_name || p?.username || '?')[0].toUpperCase()
      }
    </div>
  )

  const review = post.type === 'review' ? (post.review || post.metadata?.review || null) : null
  const reviewText = review?.body || post.body || ''
  const reviewRating = review?.rating || 0
  const albumMeta = review?.album || post.albums || null

  return (
    <div style={{
      borderBottom: '1px solid var(--border)',
      padding: '16px 20px',
      transition: 'background 0.15s',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.01)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ display: 'flex', gap: 12 }}>
        <Link href={`/profile/${post.profiles?.username}`}>
          <Avatar p={post.profiles} size={42} />
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <Link href={`/profile/${post.profiles?.username}`} style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {post.profiles?.display_name || post.profiles?.username}
            </Link>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>@{post.profiles?.username}</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>·</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{timeAgo(post.created_at)}</span>
            {currentUser?.id === post.user_id && (
              <button onClick={() => onDelete(post.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, opacity: 0.5, padding: 0 }}>×</button>
            )}
          </div>

          {post.type === 'review' && review ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: 'var(--bg)' }}>
                  {albumMeta?.cover_url ? <img src={albumMeta.cover_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : null}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{review.albumTitle || albumMeta?.title || 'Reseña de álbum'}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{review.albumArtist || albumMeta?.artist || ''}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'var(--gold)', fontSize: 13 }}>{renderStars(reviewRating)}</div>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{truncate(reviewText, 280)}</p>
            </div>
          ) : (
            <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.65, margin: '0 0 12px' }}>{post.body}</p>
          )}

          {post.type !== 'review' && post.albums && (
            <Link href={`/album/${post.album_id}`}>
              <div style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '12px 14px', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(232,197,71,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {post.albums.cover_url && (
                  <img src={post.albums.cover_url} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} referrerPolicy="no-referrer" />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.albums.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{post.albums.artist}</div>
                  {post.albums.avg_rating > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--gold)', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                      ★ {Number(post.albums.avg_rating).toFixed(1)} · {post.albums.total_ratings} reseñas
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>Ver →</span>
              </div>
            </Link>
          )}

          {post.type === 'respin' && post.original_post && (
            <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--gold)', fontFamily: "'JetBrains Mono', monospace" }}>
              {post.body || 'Re-spin'}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
            <ActionButton
              label="Comentarios"
              count={comments.length}
              active={showComments}
              activeColor="var(--gold)"
              onClick={handleCommentToggle}
              icon={
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 6h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 3V7a1 1 0 0 1 1-1Z" />
                </svg>
              }
            />

            <ActionButton
              label="Me gusta"
              count={likeCount}
              active={liked}
              activeColor="#e85d75"
              onClick={handleLike}
              icon={
                <svg viewBox="0 0 24 24" width="15" height="15" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20s-6.5-4.35-8.3-8.1A4.9 4.9 0 0 1 12 6.2a4.9 4.9 0 0 1 8.3 5.7C18.5 15.65 12 20 12 20Z" />
                </svg>
              }
            />

            <ActionButton
              label="Re-spin"
              count={respinCount}
              active={respinned}
              activeColor="var(--gold)"
              onClick={handleRespin}
              icon={
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 7h-5a4 4 0 1 0 0 8h2" />
                  <path d="m14 10 3-3-3-3" />
                  <path d="M7 17h5a4 4 0 1 0 0-8h-2" />
                  <path d="m10 14-3 3 3 3" />
                </svg>
              }
            />

            {post.album_id && (
              <Link href={`/album/${post.album_id}`} style={{
                marginLeft: 'auto', fontSize: 11, color: 'var(--muted)',
                fontFamily: "'JetBrains Mono', monospace", opacity: 0.7,
                transition: 'opacity 0.2s',
              }}>
                Ver álbum →
              </Link>
            )}
          </div>

          {showComments && (
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {comments.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>Sin comentarios aún</div>}
              {comments.map((c, idx) => (
                <div key={`${c.userId || c.user_id || 'comment'}-${idx}`} style={{ display: 'flex', gap: 8 }}>
                  <Avatar p={{ avatar_url: c.avatar_url, username: c.username, display_name: c.display_name }} size={28} />
                  <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 10, padding: '8px 12px' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>@{c.username || c.userId || 'usuario'}</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 6 }}>{timeAgo(c.timestamp || c.created_at || new Date())}</span>
                    <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0', lineHeight: 1.5 }}>{c.text || c.body}</p>
                  </div>
                </div>
              ))}
              {currentUser && (
                <form onSubmit={submitComment} style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <Avatar p={profile || currentUser} size={28} />
                  <input value={commentText} onChange={e => setCommentText(e.target.value)}
                    placeholder="Responde rápido..." style={{
                      flex: 1, padding: '7px 12px',
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 20, color: 'var(--text)',
                      fontSize: 13, fontFamily: "'Inter', sans-serif", outline: 'none',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(232,197,71,0.3)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                  <button type="submit" disabled={!commentText.trim() || submittingComment} style={{
                    background: commentText.trim() ? 'var(--gold)' : 'var(--border)',
                    border: 'none', borderRadius: 20, padding: '7px 14px',
                    color: commentText.trim() ? '#000' : 'var(--muted)',
                    fontSize: 12, fontWeight: 700, cursor: commentText.trim() ? 'pointer' : 'not-allowed',
                    fontFamily: "'Inter', sans-serif",
                  }}>→</button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
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

  const Avatar = ({ size = 42 }) => (
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
    <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
      <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 12 }}>Inicia sesión para publicar</div>
      <Link href="/login" className="btn-gold-sm">Iniciar sesión</Link>
    </div>
  )

  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <Link href={`/profile/${profile?.username}`}><Avatar /></Link>
        <div style={{ flex: 1 }}>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="¿Qué estás escuchando?"
            rows={3}
            style={{
              width: '100%', padding: '8px 0',
              background: 'transparent', border: 'none',
              color: 'var(--text)', fontSize: 17,
              fontFamily: "'Inter', sans-serif",
              resize: 'none', outline: 'none', lineHeight: 1.6,
            }}
          />

          {/* Album adjunto */}
          {album ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg)', border: '1px solid rgba(232,197,71,0.2)', borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
              <img src={album.image} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover' }} referrerPolicy="no-referrer" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{album.artist}</div>
              </div>
              <button onClick={() => setAlbum(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
          ) : (
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input value={albumSearch} onChange={e => setAlbumSearch(e.target.value)}
                placeholder="🎵 Adjuntar álbum..."
                style={{
                  width: '100%', padding: '8px 12px',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 20, color: 'var(--text)',
                  fontSize: 13, fontFamily: "'Inter', sans-serif", outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(232,197,71,0.3)'}
                onBlur={e => setTimeout(() => setAlbumResults([]), 200)}
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
            <span style={{ fontSize: 12, color: body.length > 400 ? '#f87171' : 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>
              {body.length}/500
            </span>
            <button onClick={handleSubmit} disabled={!body.trim() || submitting} style={{
              background: body.trim() ? 'var(--gold)' : 'rgba(232,197,71,0.3)',
              border: 'none', borderRadius: 100, padding: '9px 24px',
              color: body.trim() ? '#000' : 'var(--muted)',
              fontWeight: 700, fontSize: 14, cursor: body.trim() ? 'pointer' : 'not-allowed',
              fontFamily: "'Inter', sans-serif", transition: 'all 0.2s',
            }}>
              {submitting ? 'Publicando...' : 'Publicar'}
            </button>
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
  const [activeUsers, setActiveUsers] = useState([])

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

  useEffect(() => { loadPosts() }, [tab, user])

  async function loadSidebar() {
    // Top álbumes con más reseñas
    const { data: albums } = await supabase
      .from('albums')
      .select('album_id, title, artist, cover_url, avg_rating, total_ratings')
      .not('avg_rating', 'is', null)
      .order('total_ratings', { ascending: false })
      .limit(5)
    setTopAlbums(albums || [])

    // Usuarios activos recientes
    const { data: users } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .limit(6)
    setActiveUsers(users || [])
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
        ...p,
        ...payload.post,
        liked_by_me: payload.post.liked_by_me,
        like_count: payload.post.like_count || 0,
      } : p))
    }
  }

  const handleRespin = async (post) => {
    if (!user || !profile) return
    const clone = {
      id: `respin-${post.id}-${Date.now()}`,
      created_at: new Date().toISOString(),
      type: 'respin',
      body: `${profile.display_name || profile.username} le dio Re-spin`,
      profiles: profile,
      user_id: user.id,
      album_id: post.album_id,
      albums: post.albums,
      metadata: { ...post.metadata, originalPostId: post.id },
      likes: [],
      comments: [],
      respins: [],
      liked_by_me: false,
      like_count: 0,
      comment_count: 0,
      resspin_count: 0,
      original_post: post,
    }
    setPosts(prev => [clone, ...prev])
    const res = await fetch('/api/posts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'respin', postId: post.id, userId: user.id }),
    })
    const payload = await res.json()
    if (payload?.post) {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, ...payload.post, resspin_count: payload.post.respin_count || 0 } : p))
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 48px', background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 12, color: '#000' }}>W</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Wax</span>
        </Link>
        <div style={{ display: 'flex', gap: 28 }}>
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

      {/* LAYOUT 3 COLUMNAS */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px 0', display: 'grid', gridTemplateColumns: '240px 1fr 300px', gap: 0, alignItems: 'start' }}>

        {/* ── COLUMNA IZQUIERDA ── */}
        <div style={{ position: 'sticky', top: 72, padding: '24px 20px 24px 0' }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { icon: '🏠', label: 'Inicio', href: '/' },
              { icon: '🔍', label: 'Explorar', href: '/albums' },
              { icon: '📻', label: 'Feed', href: '/feed', active: true },
              { icon: '👥', label: 'Amigos', href: '/friends' },
              ...(user && profile ? [{ icon: '👤', label: 'Mi perfil', href: `/profile/${profile.username}` }] : []),
              ...(user && profile ? [{ icon: '⚙️', label: 'Editar perfil', href: '/setup' }] : []),
            ].map(({ icon, label, href, active }) => (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px', borderRadius: 100,
                color: active ? 'var(--text)' : 'var(--muted)',
                fontWeight: active ? 700 : 400, fontSize: 16,
                transition: 'all 0.15s',
                background: active ? 'var(--surface)' : 'transparent',
              }}
              onMouseEnter={e => !active && (e.currentTarget.style.background = 'var(--surface)')}
              onMouseLeave={e => !active && (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          {user && (
            <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }} style={{
              marginTop: 16, width: '100%', padding: '10px 16px',
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 100, color: 'var(--muted)',
              fontSize: 14, fontFamily: "'Inter', sans-serif", cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#f87171'; e.currentTarget.style.color = '#f87171' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
            >Cerrar sesión</button>
          )}
        </div>

        {/* ── COLUMNA CENTRAL ── */}
        <div style={{ borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)', minHeight: '100vh' }}>
          {/* Header tabs */}
          <div style={{ position: 'sticky', top: 56, background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(16px)', zIndex: 10, borderBottom: '1px solid var(--border)' }}>
            <div style={{ padding: '16px 20px 0' }}>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 900, color: 'var(--text)', marginBottom: 12 }}>Feed</h1>
            </div>
            <div style={{ display: 'flex' }}>
              {[{ id: 'global', label: 'Global' }, { id: 'siguiendo', label: 'Siguiendo' }].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                  padding: '14px', fontSize: 15, fontWeight: 600,
                  color: tab === t.id ? 'var(--text)' : 'var(--muted)',
                  borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
                  fontFamily: "'Inter', sans-serif", transition: 'color 0.2s',
                }}>{t.label}</button>
              ))}
            </div>
          </div>

          {/* Compose */}
          <CreatePost currentUser={user} profile={profile} onPost={p => setPosts(prev => [p, ...prev])} prefillAlbum={prefillAlbum} />

          {/* Posts */}
          {loading ? (
            <div style={{ padding: '20px' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: 120, borderRadius: 8, background: '#111', marginBottom: 12 }} className="skeleton" />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
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
                onToggleComments={() => {}} />
            ))
          )}
        </div>

        {/* ── COLUMNA DERECHA ── */}
        <div style={{ position: 'sticky', top: 72, padding: '24px 0 24px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Buscador */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--muted)' }}>🔍</span>
            <input
              placeholder="Buscar en Wax"
              style={{
                width: '100%', padding: '11px 14px 11px 40px',
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 100, color: 'var(--text)',
                fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(232,197,71,0.3)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
              onKeyDown={e => { if (e.key === 'Enter' && e.target.value) window.location.href = `/albums?q=${e.target.value}` }}
            />
          </div>

          {/* Top álbumes */}
          {topAlbums.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 16px 8px', fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                Top álbumes
              </div>
              {topAlbums.map((album, i) => (
                <Link key={album.album_id} href={`/album/${album.album_id}`}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 16px', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#161616'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--muted)', width: 16, flexShrink: 0 }}>{i + 1}</span>
                    {album.cover_url && <img src={album.cover_url} alt="" style={{ width: 38, height: 38, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} referrerPolicy="no-referrer" />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{album.artist}</div>
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--gold)', flexShrink: 0 }}>
                      ★{Number(album.avg_rating).toFixed(1)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Amigos sugeridos */}
          {activeUsers.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '16px 16px 8px', fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 800, color: 'var(--text)' }}>
                Amigos
              </div>
              {activeUsers.filter(u => u.username !== profile?.username).slice(0, 5).map(u => (
                <Link key={u.username} href={`/profile/${u.username}`}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#161616'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--gold-dim)', border: '1px solid rgba(232,197,71,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: 'var(--gold)',
                      overflow: 'hidden',
                    }}>
                      {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : (u.display_name || u.username || '?')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.display_name || u.username}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>@{u.username}</div>
                    </div>
                  </div>
                </Link>
              ))}
              <div style={{ padding: '10px 16px' }}>
                <Link href="/friends" style={{ fontSize: 13, color: 'var(--gold)' }}>Ver todos →</Link>
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{ fontSize: 11, color: 'var(--muted-light)', lineHeight: 1.8 }}>
            <Link href="/privacy" style={{ color: 'var(--muted-light)', marginRight: 8 }}>Privacidad</Link>
            <Link href="/terms" style={{ color: 'var(--muted-light)', marginRight: 8 }}>Términos</Link>
            <br />© 2026 Wax
          </div>
        </div>

      </div>
    </div>
  )
}