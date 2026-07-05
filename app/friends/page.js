'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'

function UserCard({ u, currentUserId, initialFollowing }) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)

  const handleFollow = async () => {
    if (!currentUserId) { window.location.href = '/login'; return }
    setLoading(true)
    if (following) {
      await supabase.from('follows').delete()
        .eq('follower_id', currentUserId).eq('following_id', u.id)
      setFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: u.id })
      setFollowing(true)
    }
    setLoading(false)
  }

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '20px 22px',
      display: 'flex', alignItems: 'center', gap: 16,
      transition: 'border-color 0.2s',
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = '#2a2a2a'}
    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Avatar */}
      <Link href={`/profile/${u.username}`}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
          background: 'var(--gold-dim)', border: '2px solid rgba(232,197,71,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: 'var(--gold)',
          overflow: 'hidden', cursor: 'pointer',
        }}>
          {u.avatar_url
            ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
            : (u.display_name || u.username || '?')[0].toUpperCase()
          }
        </div>
      </Link>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href={`/profile/${u.username}`} style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
            {u.display_name || u.username}
          </Link>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>
            @{u.username}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 6 }}>
          {u.review_count > 0 && (
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>{u.review_count}</span> reseñas
            </span>
          )}
          {u.avg_rating && (
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              <span style={{ color: 'var(--gold)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>★ {Number(u.avg_rating).toFixed(1)}</span> promedio
            </span>
          )}
          {u.shared_albums > 0 && (
            <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>
              ♪ {u.shared_albums} álbum{u.shared_albums !== 1 ? 'es' : ''} en común
            </span>
          )}
        </div>

        {/* Álbumes favoritos preview */}
        {u.top_albums && u.top_albums.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            {u.top_albums.slice(0, 4).map((album, i) => (
              album.cover_url && (
                <img key={i} src={album.cover_url} alt="" style={{ width: 36, height: 36, borderRadius: 5, objectFit: 'cover' }} referrerPolicy="no-referrer" />
              )
            ))}
            {u.review_count > 4 && (
              <div style={{
                width: 36, height: 36, borderRadius: 5,
                background: 'var(--bg)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace"
              }}>+{u.review_count - 4}</div>
            )}
          </div>
        )}
      </div>

      {/* Follow button */}
      {currentUserId && currentUserId !== u.id && (
        <button
          onClick={handleFollow}
          disabled={loading}
          style={{
            padding: '9px 20px', borderRadius: 100,
            background: following ? 'transparent' : 'var(--gold)',
            border: following ? '1px solid var(--border)' : 'none',
            color: following ? 'var(--muted)' : '#000',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", transition: 'all 0.2s',
            flexShrink: 0,
          }}
        >
          {loading ? '...' : following ? 'Siguiendo ✓' : '+ Seguir'}
        </button>
      )}
    </div>
  )
}

export default function FriendsPage() {
  const { user, profile } = useAuth()
  const [tab, setTab] = useState('recomendados')
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [recommended, setRecommended] = useState([])
  const [following, setFollowing] = useState([])
  const [myFollowingIds, setMyFollowingIds] = useState(new Set())
  const [loadingRec, setLoadingRec] = useState(true)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [loadingFollowing, setLoadingFollowing] = useState(false)

  useEffect(() => {
    if (user) {
      loadMyFollowing()
      loadRecommended()
    } else {
      loadRecommended()
    }
  }, [user])

  async function loadMyFollowing() {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
    setMyFollowingIds(new Set((data || []).map(f => f.following_id)))
  }

  async function loadRecommended() {
    setLoadingRec(true)

    // Usuarios con al menos 1 reseña, con sus stats
    const { data: usersWithReviews } = await supabase
      .from('profiles')
      .select(`
        id, username, display_name, avatar_url,
        reviews!inner(rating, album_id, albums(cover_url, title))
      `)
      .neq('id', user?.id || '00000000-0000-0000-0000-000000000000')
      .limit(50)

    if (!usersWithReviews) { setLoadingRec(false); return }

    // Calcular afinidad para cada usuario
    let myGoodAlbumIds = new Set()
    if (user) {
      const { data: myReviews } = await supabase
        .from('reviews')
        .select('album_id, rating')
        .eq('user_id', user.id)
        .gte('rating', 7)
      myGoodAlbumIds = new Set((myReviews || []).map(r => r.album_id))
    }

    const enriched = usersWithReviews.map(u => {
      const reviews = u.reviews || []
      const goodReviews = reviews.filter(r => r.rating >= 7)
      const sharedAlbums = user
        ? goodReviews.filter(r => myGoodAlbumIds.has(r.album_id)).length
        : 0
      const avgRating = reviews.length > 0
        ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
        : 0
      const topAlbums = goodReviews
        .filter(r => r.albums?.cover_url)
        .slice(0, 4)
        .map(r => r.albums)

      return {
        ...u,
        review_count: reviews.length,
        avg_rating: avgRating > 0 ? avgRating.toFixed(1) : null,
        shared_albums: sharedAlbums,
        top_albums: topAlbums,
        affinity_score: sharedAlbums * 3 + goodReviews.length + reviews.length * 0.5,
      }
    })
    .filter(u => u.review_count > 0)
    .sort((a, b) => b.affinity_score - a.affinity_score)

    setRecommended(enriched)
    setLoadingRec(false)
  }

  async function loadFollowing() {
    if (!user) return
    setLoadingFollowing(true)
    const { data: followingIds } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    if (!followingIds?.length) { setFollowing([]); setLoadingFollowing(false); return }

    const ids = followingIds.map(f => f.following_id)
    const { data: users } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', ids)

    // Enriquecer con stats de reviews
    const enriched = await Promise.all((users || []).map(async u => {
      const { data: revs } = await supabase
        .from('reviews')
        .select('rating, albums(cover_url)')
        .eq('user_id', u.id)
        .limit(10)
      const avgRating = revs?.length > 0
        ? (revs.reduce((s, r) => s + r.rating, 0) / revs.length).toFixed(1)
        : null
      return { ...u, review_count: revs?.length || 0, avg_rating: avgRating, top_albums: (revs || []).filter(r => r.albums?.cover_url).map(r => r.albums).slice(0, 4), shared_albums: 0 }
    }))
    setFollowing(enriched)
    setLoadingFollowing(false)
  }

  useEffect(() => {
    if (tab === 'siguiendo') loadFollowing()
  }, [tab])

  // Búsqueda
  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return }
    const t = setTimeout(async () => {
      setLoadingSearch(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .ilike('username', `%${query}%`)
        .neq('id', user?.id || '')
        .limit(8)

      const enriched = await Promise.all((data || []).map(async u => {
        const { data: revs } = await supabase
          .from('reviews')
          .select('rating, albums(cover_url)')
          .eq('user_id', u.id)
          .limit(4)
        return {
          ...u,
          review_count: revs?.length || 0,
          avg_rating: revs?.length > 0 ? (revs.reduce((s, r) => s + r.rating, 0) / revs.length).toFixed(1) : null,
          top_albums: (revs || []).filter(r => r.albums?.cover_url).map(r => r.albums),
          shared_albums: 0,
        }
      }))
      setSearchResults(enriched)
      setLoadingSearch(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const tabStyle = (id) => ({
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '12px 20px', fontSize: 15, fontWeight: 600,
    color: tab === id ? 'var(--text)' : 'var(--muted)',
    borderBottom: tab === id ? '2px solid var(--gold)' : '2px solid transparent',
    marginBottom: -1, fontFamily: "'Inter', sans-serif", transition: 'color 0.2s',
  })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 48px', background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 13, color: '#000' }}>W</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 700, color: 'var(--text)' }}>Wax</span>
        </Link>
        <div style={{ display: 'flex', gap: 32 }}>
          {[{ label: 'Álbumes', href: '/albums' }, { label: 'Feed', href: '/feed' }, { label: 'Amigos', href: '/friends' }, { label: 'Quiz', href: '/quiz' }].map(({ label, href }) => (
            <Link key={href} href={href} className="nav-link" style={{ color: href === '/friends' ? 'var(--text)' : undefined }}>{label}</Link>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {user && profile ? (
            <Link href={`/profile/${profile.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 100, padding: '7px 14px 7px 8px' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid rgba(232,197,71,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: 12, fontWeight: 700, color: 'var(--gold)', overflow: 'hidden' }}>
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

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '96px 48px 60px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
            Comunidad
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 900, color: 'var(--text)', lineHeight: 1.05 }}>
            Encuentra tu <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>tribu musical.</em>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>
            Personas con gustos similares a los tuyos, basado en álbumes que ambos amaron.
          </p>
        </div>

        {/* Buscador */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--muted)' }}>🔍</span>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por username..."
            style={{
              width: '100%', padding: '14px 18px 14px 48px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, color: 'var(--text)',
              fontSize: 15, fontFamily: "'Inter', sans-serif", outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(232,197,71,0.4)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Search results */}
        {query.trim() ? (
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
              {loadingSearch ? 'Buscando...' : `${searchResults.length} resultado${searchResults.length !== 1 ? 's' : ''}`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {searchResults.map(u => (
                <UserCard key={u.id} u={u} currentUserId={user?.id} initialFollowing={myFollowingIds.has(u.id)} />
              ))}
              {!loadingSearch && searchResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
                  No encontramos a nadie con ese username
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
              <button onClick={() => setTab('recomendados')} style={tabStyle('recomendados')}>
                ✨ Recomendamos
              </button>
              {user && (
                <button onClick={() => setTab('siguiendo')} style={tabStyle('siguiendo')}>
                  Siguiendo
                </button>
              )}
            </div>

            {/* Recomendados */}
            {tab === 'recomendados' && (
              <div>
                {user && recommended.some(u => u.shared_albums > 0) && (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(232,197,71,0.06), transparent)',
                    border: '1px solid rgba(232,197,71,0.15)',
                    borderRadius: 14, padding: '14px 18px', marginBottom: 20,
                    fontSize: 13, color: 'var(--muted)', lineHeight: 1.6,
                  }}>
                    💡 Basado en álbumes que calificaste <span style={{ color: 'var(--gold)', fontWeight: 600 }}>7 o más</span> — personas con gustos musicales similares a los tuyos.
                  </div>
                )}

                {loadingRec ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} style={{ height: 100, borderRadius: 16, background: '#111' }} className="skeleton" />
                    ))}
                  </div>
                ) : recommended.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>
                      Aún no hay amigos
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                      Invita amigos para encontrar personas con tu gusto musical
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {/* Primero los que tienen álbumes en común */}
                    {recommended.filter(u => u.shared_albums > 0).length > 0 && user && (
                      <>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4, marginTop: 4 }}>
                          Alta afinidad musical
                        </div>
                        {recommended.filter(u => u.shared_albums > 0).map(u => (
                          <UserCard key={u.id} u={u} currentUserId={user?.id} initialFollowing={myFollowingIds.has(u.id)} />
                        ))}
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4, marginTop: 12 }}>
                          Otros oyentes activos
                        </div>
                      </>
                    )}
                    {recommended.filter(u => u.shared_albums === 0 || !user).map(u => (
                      <UserCard key={u.id} u={u} currentUserId={user?.id} initialFollowing={myFollowingIds.has(u.id)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Siguiendo */}
            {tab === 'siguiendo' && user && (
              <div>
                {loadingFollowing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} style={{ height: 100, borderRadius: 16, background: '#111' }} className="skeleton" />
                    ))}
                  </div>
                ) : following.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>
                      No sigues a nadie aún
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 20 }}>
                      Busca amigos arriba o mira los recomendados
                    </div>
                    <button onClick={() => setTab('recomendados')} className="btn-gold-sm">Ver recomendados</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {following.map(u => (
                      <UserCard key={u.id} u={u} currentUserId={user?.id} initialFollowing={true} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}