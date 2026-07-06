'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from './components/AuthProvider'
import { supabase } from './lib/supabase'

function Img({ src, alt, style }) {
  if (!src) return null
  return (
    <img src={src} alt={alt || ''} referrerPolicy="no-referrer"
      style={{ ...style, display: 'block' }}
      onError={(e) => { e.target.style.display = 'none' }}
    />
  )
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  return `hace ${Math.floor(diff / 86400)}d`
}

function StarRating({ rating }) {
  const stars = Math.round(rating / 2)
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--gold)', letterSpacing: 1 }}>
      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
      <span style={{ fontSize: 11, marginLeft: 6, color: 'var(--muted)' }}>{rating}/10</span>
    </span>
  )
}

// ── CARD DE ÁLBUM ─────────────────────────────────────────
function AlbumCard({ album }) {
  return (
    <Link href={`/album/${album.id}`} style={{ textDecoration: 'none' }}>
      <div className="album-card" style={{ flexShrink: 0, width: 150, cursor: 'pointer' }}>
        <div style={{ width: 150, height: 150, borderRadius: 10, overflow: 'hidden', background: '#1a1a1a', border: '1px solid var(--border)', marginBottom: 10, position: 'relative' }}>
          {album.image
            ? <Img src={album.image} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: 'var(--muted)' }}>♫</div>
          }
          <div className="album-overlay">
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
              <span style={{ fontSize: 16, marginLeft: 3 }}>▶</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.artist}</div>
      </div>
    </Link>
  )
}

// ── PANTALLA: NO LOGUEADO ─────────────────────────────────
function GuestHero() {
  return (
    <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'radial-gradient(ellipse at 30% 50%, rgba(232,197,71,0.06) 0%, transparent 60%)' }} />
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 1200, margin: '0 auto', padding: '80px 48px 0', width: '100%' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--gold-dim)', border: '1px solid rgba(232,197,71,0.2)', borderRadius: 100, padding: '5px 14px', marginBottom: 28 }}>
          <span className="dot-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', display: 'block' }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 500, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Tu diario musical</span>
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(52px, 7vw, 88px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 24, maxWidth: 680 }}>
          Cada álbum<br />cuenta <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>una<br />historia.</em>
        </h1>
        <p style={{ fontSize: 17, lineHeight: 1.75, color: 'var(--muted)', marginBottom: 40, maxWidth: 440 }}>
          Califica. Reseña. Descubre. Música recomendada según tu gusto real — no algoritmos genéricos.
        </p>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
          <Link href="/register" className="btn-gold-lg">Crear cuenta gratis</Link>
          <Link href="/login" className="btn-ghost-lg">Ya tengo cuenta →</Link>
        </div>
        <div style={{ display: 'flex', gap: 40, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
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

// ── PANTALLA: POCOS ÁLBUMES ───────────────────────────────
function NeedMoreRatings({ count, username }) {
  const needed = 3 - count
  return (
    <section style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 48px' }}>
      <div style={{ textAlign: 'center', maxWidth: 520 }}>
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid rgba(232,197,71,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M9 18V5l12-2v13" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="6" cy="18" r="3" stroke="var(--gold)" strokeWidth="1.5"/>
            <circle cx="18" cy="16" r="3" stroke="var(--gold)" strokeWidth="1.5"/>
          </svg>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>
          Casi listo
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, color: 'var(--text)', lineHeight: 1.1, marginBottom: 14 }}>
          Cuéntanos tu <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>gusto musical</em>
        </h2>
        <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 12 }}>
          Califica al menos <strong style={{ color: 'var(--text)' }}>3 álbumes con 7 o más</strong> para que podamos recomendarte música que realmente te va a gustar.
        </p>
        {count > 0 && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,197,71,0.08)', border: '1px solid rgba(232,197,71,0.2)', borderRadius: 100, padding: '6px 16px', marginBottom: 28 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--gold)' }}>
              {count}/3 — faltan {needed} más
            </span>
          </div>
        )}
        {count === 0 && <div style={{ marginBottom: 28 }} />}
        <div>
          <Link href="/albums" className="btn-gold-lg">Explorar álbumes</Link>
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
          Solo se cuentan álbumes con calificación 7 o más
        </div>
      </div>
    </section>
  )
}

// ── SECCIÓN DE RECOMENDACIONES ────────────────────────────
function RecommendedSection({ title, label, items, renderItem, scrollable }) {
  return (
    <section style={{ padding: '60px 0', borderTop: '1px solid var(--border)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', marginBottom: 24 }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
          {label}
        </div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{title}</h2>
      </div>
      {scrollable ? (
        <div style={{ paddingLeft: 48, overflowX: 'auto', paddingBottom: 4 }} className="scrollbar-hide">
          <div style={{ display: 'flex', gap: 16, width: 'max-content', paddingRight: 48 }}>
            {items.map((item, i) => renderItem(item, i))}
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px' }}>
          {items.map((item, i) => renderItem(item, i))}
        </div>
      )}
    </section>
  )
}

// ── MAIN ──────────────────────────────────────────────────
export default function LandingClient() {
  const { user, profile } = useAuth()
  const [reviews, setReviews] = useState([])
  const [recAlbums, setRecAlbums] = useState([])
  const [recArtists, setRecArtists] = useState([])
  const [recTracks, setRecTracks] = useState([])
  const [classicHeroAlbums, setClassicHeroAlbums] = useState([])
  const [reviewedHeroAlbums, setReviewedHeroAlbums] = useState([])
  const [goodRatingsCount, setGoodRatingsCount] = useState(0)
  const [loadingRecs, setLoadingRecs] = useState(true)
  const [country, setCountry] = useState('mx')
  const CACHE_TTL = 30 * 60 * 1000
  const cacheKey = user ? `wax_recs_${user.id}` : null

  useEffect(() => {
    async function fetchClassicHeroAlbums() {
      const catalog = [
        { artist: 'Michael Jackson', title: 'Thriller' },
        { artist: 'Jeff Buckley', title: 'Grace' },
        { artist: 'Elvis Presley', title: 'ELV1S' },
        { artist: 'Arctic Monkeys', title: 'AM' },
        { artist: 'Radiohead', title: 'OK Computer' },
        { artist: 'Gustavo Cerati', title: 'Bocanada' },
      ]

      const items = await Promise.all(catalog.map(async ({ artist, title }) => {
        try {
          const res = await fetch(
            `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}&entity=album&limit=1`
          )
          const data = await res.json()
          const album = data.results?.[0]
          if (!album) return null
          return {
            id: `${artist}-${title}`,
            name: title,
            artist,
            image: (album.artworkUrl100 || '').replace('100x100bb', '200x200bb'),
          }
        } catch {
          return null
        }
      }))

      setClassicHeroAlbums(items.filter(Boolean))
    }

    fetchClassicHeroAlbums()
  }, [])

  // Reseñas recientes — siempre
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

  // Recomendaciones — solo si hay sesión
  useEffect(() => {
    if (!user) { setLoadingRecs(false); return }
    loadRecommendations()
  }, [user, country])

  async function loadRecommendations() {
    setLoadingRecs(true)

    const CACHE_KEY = cacheKey

    if (typeof window !== 'undefined' && CACHE_KEY) {
      const cached = window.localStorage.getItem(CACHE_KEY)
      if (cached) {
        try {
          const { data, timestamp } = JSON.parse(cached)
          if (Date.now() - timestamp < CACHE_TTL) {
            setRecAlbums(data.albums)
            setRecArtists(data.artists)
            setRecTracks(data.tracks)
            setGoodRatingsCount(data.count)
            setLoadingRecs(false)
            return
          }
        } catch {}
      }
    }

    // 1. Álbumes que el usuario calificó 7+
    const { data: goodReviews } = await supabase
      .from('reviews')
      .select('album_id, rating, albums!reviews_album_id_fkey(title, artist, genre)')
      .eq('user_id', user.id)
      .gte('rating', 7)

    const count = goodReviews?.length || 0
    setGoodRatingsCount(count)

    if (count < 3) {
      setRecAlbums([])
      setRecArtists([])
      setRecTracks([])
      setLoadingRecs(false)
      return
    }

    // 2. Obtener álbumes del usuario para el segundo carrusel
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('album_id, created_at, albums!reviews_album_id_fkey(title, artist, cover_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    const ratedIds = new Set((allReviews || []).map(r => r.album_id))
    const heroReviewed = (allReviews || [])
      .map(r => ({
        id: String(r.album_id),
        name: r.albums?.title || 'Álbum',
        artist: r.albums?.artist || 'Artista',
        image: r.albums?.cover_url || '',
      }))
      .filter(a => a.image)
    setReviewedHeroAlbums(heroReviewed)

    // 4. Extraer géneros favoritos
    const genres = [...new Set(
      (goodReviews || [])
        .map(r => r.albums?.genre)
        .filter(Boolean)
    )]

    // 5. Artistas favoritos del usuario
    const favoriteArtists = [...new Set(
      (goodReviews || []).map(r => r.albums?.artist).filter(Boolean)
    )]

    // 6. Buscar en iTunes álbumes recomendados
    const searchTerms = [
      ...genres.slice(0, 2),
      ...favoriteArtists.slice(0, 2),
      'indie', 'alternative', // joyitas
    ]

    const albumResults = []
    for (const term of searchTerms.slice(0, 4)) {
      try {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=8&country=${country}`
        )
        const data = await res.json()
        const albums = (data.results || [])
          .filter(a => !ratedIds.has(String(a.collectionId)))
          .map(a => ({
            id: String(a.collectionId),
            name: a.collectionName,
            artist: a.artistName,
            image: (a.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
            genre: a.primaryGenreName || '',
            year: a.releaseDate?.slice(0, 4) || '',
          }))
          .filter(a => a.image)
        albumResults.push(...albums)
      } catch {}
    }

    // Deduplicar y mezclar (algunos populares, algunos menos conocidos)
    const seen = new Set()
    const unique = albumResults.filter(a => {
      if (seen.has(a.id)) return false
      seen.add(a.id)
      return true
    })
    // Mezclar: 70% primeros resultados (más populares), 30% del final (joyitas)
    const popular = unique.slice(0, Math.floor(unique.length * 0.7))
    const hidden = unique.slice(Math.floor(unique.length * 0.7))
    const mixed = [...shuffle(popular).slice(0, 10), ...shuffle(hidden).slice(0, 5)]
    const finalAlbums = shuffle(mixed).slice(0, 12)
    setRecAlbums(finalAlbums)

    // 6. Artistas recomendados — basados en los que el usuario ya calificó bien
    // En lugar de buscar en Last.fm, usamos artistas de sus propias reseñas buenas
    const likedArtists = [...new Set(
      (goodReviews || [])
        .sort((a, b) => b.rating - a.rating) // los mejor calificados primero
        .map(r => r.albums?.artist)
        .filter(Boolean)
    )]

    // Buscar artistas similares en Last.fm usando los que ya le gustan
    const similarArtists = []
    for (const artist of likedArtists.slice(0, 3)) {
      try {
        const res = await fetch(
          `https://ws.audioscrobbler.com/2.0/?method=artist.getSimilar&artist=${encodeURIComponent(artist)}&api_key=d98e3e57fa365982f4f7e4f729edce51&format=json&limit=4`
        )
        const data = await res.json()
        const similar = (data.similarartists?.artist || []).map(a => a.name)
        similarArtists.push(...similar)
      } catch {}
    }

    // Deduplicar y quitar los que ya conoce
    const knownArtists = new Set(likedArtists.map(a => a.toLowerCase()))
    const candidates = [...new Set(similarArtists)]
      .filter(name => !knownArtists.has(name.toLowerCase()))
      .slice(0, 8)

    // Buscar foto en Spotify usando el endpoint de artista disponible
    const enrichedArtists = await Promise.all(
      candidates.map(async (name) => {
        try {
          const res = await fetch(
            `/api/artist?q=${encodeURIComponent(name)}`
          )
          const data = await res.json()
          const sp = data.artists?.[0]
          if (sp && sp.image) {
            return { id: sp.id, name: sp.name, image: sp.image }
          }
        } catch {}
        return null
      })
    )

    const finalArtists = enrichedArtists.filter(Boolean).slice(0, 8)
    setRecArtists(finalArtists)

    // 7. Canciones recomendadas del país
    let tracks = []
    try {
      const res = await fetch(
        `https://itunes.apple.com/${country}/rss/topsongs/limit=10/json`
      )
      const data = await res.json()
      tracks = (data.feed?.entry || []).map(t => ({
        name: t['im:name']?.label || '',
        artist: t['im:artist']?.label || '',
        image: t['im:image']?.[2]?.label?.replace('170x170', '600x600') || '',
        id: t['id']?.attributes?.['im:id'] || '',
      })).filter(t => t.image)
      setRecTracks(tracks)
    } catch {}

    if (typeof window !== 'undefined' && CACHE_KEY) {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: {
          albums: finalAlbums,
          artists: finalArtists,
          tracks,
          count,
        },
        timestamp: Date.now(),
      }))
    }

    setLoadingRecs(false)
  }

  function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const hasEnoughRatings = goodRatingsCount >= 3

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', overflowX: 'hidden' }}>

      {/* NAV */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 48px', background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 13, color: '#000' }}>W</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 700, color: 'var(--text)' }}>Wax</span>
        </Link>
        <div style={{ display: 'flex', gap: 32 }}>
          {[{ label: 'Álbumes', href: '/albums' }, { label: 'Feed', href: '/feed' }, { label: 'Amigos', href: '/friends' }, { label: 'Quiz', href: '/quiz' }].map(({ label, href }) => (
            <Link key={href} href={href} className="nav-link">{label}</Link>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {user && profile ? (
            <Link href={`/profile/${profile.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 100, padding: '7px 14px 7px 8px', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(232,197,71,0.3)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
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

      {/* CONTENIDO PRINCIPAL */}
      <div style={{ paddingTop: 64 }}>

        {/* Sin sesión */}
        {!user && <GuestHero />}

        {/* Con sesión pero pocos ratings */}
        {user && !loadingRecs && !hasEnoughRatings && (
          <NeedMoreRatings count={goodRatingsCount} username={profile?.username} />
        )}

        {/* Loading */}
        {user && loadingRecs && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>
              Preparando tus recomendaciones...
            </div>
          </div>
        )}

        {/* Recomendaciones personalizadas */}
        {user && !loadingRecs && hasEnoughRatings && (
          <>
            {/* Header personalizado */}
            <section style={{ padding: '48px 48px 0', maxWidth: 1200, margin: '0 auto' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(52px, 7vw, 88px)', fontWeight: 900, color: 'var(--text)', lineHeight: 1.0, maxWidth: 760 }}>
                Cada álbum cuenta <em style={{ color: '#E8C547', fontStyle: 'italic' }}>una historia.</em>
              </div>

              <div style={{ marginTop: 40, display: 'grid', gap: 28 }}>
                <div className="hero-carousel" style={{ height: 280 }}>
                  <div className="hero-carousel-track hero-carousel-track--right">
                    {classicHeroAlbums.length > 0 ? [...classicHeroAlbums, ...classicHeroAlbums].map((album, index) => (
                      <div key={`${album.id || album.name}-${index}`} className="hero-carousel-item">
                        <Img src={album.image} alt={`${album.name} - ${album.artist}`} style={{ width: 200, height: 200, borderRadius: 12, objectFit: 'cover' }} />
                        <div className="hero-carousel-item-label">
                          <div className="hero-carousel-item-title">{album.name}</div>
                          <div className="hero-carousel-item-subtitle">{album.artist}</div>
                        </div>
                      </div>
                    )) : Array.from({ length: 6 }).map((_, index) => (
                      <div key={`classic-skel-${index}`} className="hero-carousel-item">
                        <div className="skeleton" style={{ width: 200, height: 200, borderRadius: 12, background: '#111' }} />
                        <div className="hero-carousel-item-label" style={{ opacity: 1 }}>
                          <div className="hero-carousel-item-title" style={{ background: '#1a1a1a', borderRadius: 6, height: 14, width: '100%' }} />
                          <div className="hero-carousel-item-subtitle" style={{ background: '#1a1a1a', borderRadius: 6, height: 12, width: '80%', marginTop: 8 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hero-carousel" style={{ height: 280 }}>
                  <div className="hero-carousel-track hero-carousel-track--left">
                    {loadingRecs ? (
                      Array.from({ length: 8 }).flatMap((_, i) => [
                        <div key={`skel-${i}-1`} className="hero-carousel-item">
                          <div className="skeleton" style={{ width: 200, height: 200, borderRadius: 12, background: '#111' }} />
                          <div className="hero-carousel-item-label" style={{ opacity: 1 }}>
                            <div className="hero-carousel-item-title" style={{ background: '#1a1a1a', borderRadius: 6, height: 14, width: '100%' }} />
                            <div className="hero-carousel-item-subtitle" style={{ background: '#1a1a1a', borderRadius: 6, height: 12, width: '80%', marginTop: 8 }} />
                          </div>
                        </div>,
                        <div key={`skel-${i}-2`} className="hero-carousel-item">
                          <div className="skeleton" style={{ width: 200, height: 200, borderRadius: 12, background: '#111' }} />
                          <div className="hero-carousel-item-label" style={{ opacity: 1 }}>
                            <div className="hero-carousel-item-title" style={{ background: '#1a1a1a', borderRadius: 6, height: 14, width: '100%' }} />
                            <div className="hero-carousel-item-subtitle" style={{ background: '#1a1a1a', borderRadius: 6, height: 12, width: '80%', marginTop: 8 }} />
                          </div>
                        </div>
                      ])
                    ) : reviewedHeroAlbums.length > 0 ? (
                      [...reviewedHeroAlbums, ...reviewedHeroAlbums].map((album, index) => (
                        <div key={`reviewed-${index}`} className="hero-carousel-item">
                          <Img src={album.image} alt={`${album.name} - ${album.artist}`} style={{ width: 200, height: 200, borderRadius: 12, objectFit: 'cover' }} />
                          <div className="hero-carousel-item-label">
                            <div className="hero-carousel-item-title">{album.name}</div>
                            <div className="hero-carousel-item-subtitle">{album.artist}</div>
                          </div>
                        </div>
                      ))
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            {/* Álbumes recomendados */}
            {recAlbums.length > 0 && (
              <section style={{ padding: '40px 0', borderTop: '1px solid var(--border)', marginTop: 40 }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 48px', marginBottom: 24 }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Álbumes recomendados</div>
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>Te pueden gustar</h2>
                </div>
                <div style={{ paddingLeft: 48, overflowX: 'auto', paddingBottom: 4 }} className="scrollbar-hide">
                  <div style={{ display: 'flex', gap: 16, width: 'max-content', paddingRight: 48 }}>
                    {recAlbums.map((album, i) => <AlbumCard key={i} album={album} />)}
                  </div>
                </div>
              </section>
            )}

            {/* Artistas recomendados */}
            {recArtists.length > 0 && (
              <section style={{ padding: '40px 48px', maxWidth: 1200, margin: '0 auto', borderTop: '1px solid var(--border)' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Artistas recomendados</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 24 }}>Quizás te interesen</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  {recArtists.map((artist, i) => (
                    <div key={i} className="artist-card"
                      onClick={() => {
                        fetch(`/api/artist?q=${encodeURIComponent(artist.name)}`)
                          .then(r => r.json())
                          .then(data => { const id = data.artists?.[0]?.id; if (id) window.location.href = `/artist/${id}` })
                      }}
                      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#1a1a1a', border: '2px solid var(--border)' }}>
                        {artist.image
                          ? <Img src={artist.image} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--muted)' }}>♪</div>
                        }
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist.name}</div>
                        {artist.genre && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{artist.genre}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Canciones del momento por país */}
            {recTracks.length > 0 && (
              <section style={{ padding: '40px 48px', maxWidth: 1200, margin: '0 auto', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>
                      Canciones del momento
                    </div>
                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>Top 10</h2>
                  </div>
                  <select value={country} onChange={e => {
                    if (typeof window !== 'undefined' && cacheKey) {
                      window.localStorage.removeItem(cacheKey)
                    }
                    setCountry(e.target.value)
                  }} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--muted)', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer', outline: 'none' }}>
                    {[{ code: 'mx', label: 'México' }, { code: 'es', label: 'España' }, { code: 'ar', label: 'Argentina' }, { code: 'co', label: 'Colombia' }, { code: 'cl', label: 'Chile' }, { code: 've', label: 'Venezuela' }, { code: 'pe', label: 'Perú' }, { code: 'hn', label: 'Honduras' }].map(({ code, label }) => (
                      <option key={code} value={code}>{label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {recTracks.map((track, i) => (
                    <div key={i} className="review-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--muted)', width: 22, textAlign: 'center', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                      <div style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#1a1a1a' }}>
                        <Img src={track.image} alt={track.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{track.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* RESEÑAS RECIENTES — siempre visible */}
        <section style={{ padding: '60px 48px', maxWidth: 1200, margin: '0 auto', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Comunidad</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 24 }}>Reseñas recientes</h2>
          {reviews.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {reviews.map((review, i) => (
                <Link key={i} href={`/album/${review.album_id}`} style={{ display: 'block' }}>
                  <div className="review-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', cursor: 'pointer' }}>
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
                    <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 8, lineHeight: 1.65 }}>{review.body}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 14 }}>
              Aún no hay reseñas. ¡Sé el primero!
              <br />
              <Link href="/albums" style={{ color: 'var(--gold)', marginTop: 12, display: 'inline-block' }}>Explorar álbumes →</Link>
            </div>
          )}
        </section>

        {/* FOOTER */}
        <footer style={{ padding: '32px 48px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 1200, margin: '0 auto' }}>
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