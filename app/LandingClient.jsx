'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from './components/AuthProvider'
import { supabase } from './lib/supabase'
import Navbar from './components/Navbar'

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  return `hace ${Math.floor(diff / 86400)}d`
}

function StarRating({ rating }) {
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 15, fontWeight: 700, color: 'var(--gold)' }}>
      {rating}/10
    </span>
  )
}

function GuestHero() {
  return (
    <section className="hero-section" style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'radial-gradient(ellipse at 30% 50%, rgba(232,197,71,0.06) 0%, transparent 60%)' }} />
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', padding: 'clamp(40px, 8vw, 80px) clamp(16px, 5vw, 48px) 0', width: '100%' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--gold-dim)', border: '1px solid rgba(232,197,71,0.2)', borderRadius: 100, padding: '5px 14px', marginBottom: 28 }}>
          <span className="dot-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', display: 'block' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Tu diario musical</span>
        </div>
        <h1 className="hero-title" style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px, 6vw, 88px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 24, maxWidth: 680 }}>
          Cada álbum<br />cuenta <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>una<br />historia.</em>
        </h1>
        <p className="hero-subtitle" style={{ fontSize: 17, lineHeight: 1.75, color: 'var(--muted)', marginBottom: 40, maxWidth: 440 }}>
          Califica. Reseña. Descubre. Música recomendada según tu gusto real — no algoritmos genéricos.
        </p>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
          <Link href="/register" className="btn-gold-lg">Crear cuenta gratis</Link>
          <Link href="/login" className="btn-ghost-lg">Ya tengo cuenta →</Link>
        </div>
        <div className="hero-stats" style={{ display: 'flex', gap: 40, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
          {[{ n: '10K+', label: 'Álbumes' }, { n: '2.4K', label: 'Reseñas' }, { n: '800+', label: 'Oyentes' }].map(({ n, label }) => (
            <div key={label}>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 500, color: 'var(--text)' }}>{n}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function LandingClient() {
  const { user, loading } = useAuth()
  const [reviews, setReviews] = useState([])
  const [redirecting, setRedirecting] = useState(false)

  useEffect(() => {
    if (user) {
      setRedirecting(true)
      window.location.replace('/feed')
    }
  }, [user])

  if (loading || redirecting) return null

  useEffect(() => {
    supabase
      .from('reviews')
      .select(`
        id, rating, body, created_at, album_id,
        profiles!reviews_user_id_fkey(username, display_name, avatar_url),
        albums!reviews_album_id_fkey(title, artist, cover_url, album_id)
      `)
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data }) => { if (data?.length) setReviews(data) })
  }, [])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', overflowX: 'hidden' }}>
      <Navbar activePage="/" />
      <div style={{ paddingTop: 64 }}>

        {!user && <GuestHero />}

        <section className="section-padded" style={{ padding: 'clamp(32px, 8vw, 60px) clamp(16px, 5vw, 48px)', maxWidth: 1200, margin: '0 auto', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Comunidad</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 24 }}>Reseñas recientes</h2>
          {reviews.length > 0 ? (
            <div className="reviews-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {reviews.map((review, i) => {
                const bodyText = review.body || ''
                const isLong = bodyText.length > 180
                return (
                  <div key={i} className="review-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', height: 210, overflow: 'hidden' }}>
                    <Link href={`/album/${review.album_id}`} style={{ display: 'block' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid rgba(232,197,71,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700, color: 'var(--gold)', flexShrink: 0, overflow: 'hidden' }}>
                          {review.profiles?.avatar_url
                            ? <img src={review.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                            : (review.profiles?.display_name || review.profiles?.username || '?')[0].toUpperCase()
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>@{review.profiles?.username}</span>
                            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>{timeAgo(review.created_at)}</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                            <em style={{ color: 'var(--text)', fontStyle: 'normal', fontWeight: 500 }}>{review.albums?.title}</em>
                            {review.albums?.artist && ` · ${review.albums.artist}`}
                          </div>
                        </div>
                      </div>
                      <StarRating rating={review.rating} />
                    </Link>
                    <div style={{ flex: 1, minHeight: 0, position: 'relative', marginTop: 8 }}>
                      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, margin: 0, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{bodyText}</p>
                      {isLong && (
                        <Link href={`/feed#post-${review.id}`} style={{ display: 'block', marginTop: 4, fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>Ver más →</Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
              Aún no hay reseñas. ¡Sé el primero!<br />
              <Link href="/albums" style={{ color: 'var(--gold)', marginTop: 12, display: 'inline-block' }}>Explorar álbumes →</Link>
            </div>
          )}
        </section>

        <footer className="footer-row" style={{ padding: 'clamp(20px, 4vw, 32px) clamp(16px, 5vw, 48px)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: 10, fontWeight: 700, color: '#000' }}>W</div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 13, color: 'var(--muted)' }}>© 2026 Wax</span>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Privacidad', 'Términos'].map(l => (
              <Link key={l} href={`/${l.toLowerCase()}`} className="nav-link" style={{ textTransform: 'none', letterSpacing: 0 }}>{l}</Link>
            ))}
          </div>
        </footer>

      </div>
    </div>
  )
}