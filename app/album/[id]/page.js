'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../components/AuthProvider'
import Navbar from '../../components/Navbar'

// ── MINI PLAYER ──────────────────────────────────────────
function MiniPlayer({ track, onClose }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(30)
  const router = useRouter()

  useEffect(() => {
    if (!track?.preview) return
    const audio = audioRef.current
    if (!audio) return
    audio.src = track.preview
    audio.play().then(() => setPlaying(true)).catch(() => {})
    const onTime = () => {
      setCurrentTime(audio.currentTime)
      setDuration(audio.duration || 30)
      setProgress((audio.currentTime / (audio.duration || 30)) * 100)
    }
    const onEnd = () => { setPlaying(false); setProgress(0) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd); audio.pause() }
  }, [track])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) } else { audio.play(); setPlaying(true) }
  }

  const seek = (e) => {
    const audio = audioRef.current
    if (!audio) return
    const rect = e.currentTarget.getBoundingClientRect()
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * (audio.duration || 30)
  }

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  if (!track) return null
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(10,10,10,0.97)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)', padding: '12px 48px',
      display: 'flex', alignItems: 'center', gap: 20,
    }}>
      <audio ref={audioRef} />
      <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#1a1a1a' }}>
        {track.image && <img src={track.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />}
      </div>
      <div style={{ minWidth: 0, flex: '0 0 200px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{track.artist}</div>
      </div>
      <button onClick={toggle} style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--gold)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, color: '#000' }}>
        {playing ? '⏸' : '▶'}
      </button>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>{fmt(currentTime)}</span>
        <div onClick={seek} style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, cursor: 'pointer' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--gold)', borderRadius: 2, transition: 'width 0.1s linear' }} />
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>{fmt(duration)}</span>
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>PREVIEW 30s</div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20, flexShrink: 0 }}>×</button>
    </div>
  )
}

// ── STAR PICKER ───────────────────────────────────────────
function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5,6,7,8,9,10].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
            fontSize: 22,
            color: n <= (hover || value) ? 'var(--gold)' : 'var(--border)',
            transition: 'color 0.1s',
          }}
        >★</button>
      ))}
      {value > 0 && (
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--gold)', alignSelf: 'center', marginLeft: 8 }}>
          {value}/10
        </span>
      )}
    </div>
  )
}

// ── REVIEW CARD ───────────────────────────────────────────
function ReviewCard({ review }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '20px 22px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'var(--gold-dim)', border: '1px solid rgba(232,197,71,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, color: 'var(--gold)', flexShrink: 0,
          overflow: 'hidden',
        }}>
          {review.profiles?.avatar_url
            ? <img src={review.profiles.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
            : (review.profiles?.display_name || review.profiles?.username || '?')[0].toUpperCase()
          }
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
              @{review.profiles?.username || 'usuario'}
            </span>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>
              {new Date(review.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <span style={{ color: 'var(--gold)', fontSize: 13 }}>{'★'.repeat(Math.round(review.rating / 2))}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>{review.rating}/10</span>
          </div>
        </div>
      </div>
      <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>{review.body}</p>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────
export default function AlbumPage() {
  const { id } = useParams()
  const router = useRouter()
  const { user, profile } = useAuth()

  const [album, setAlbum] = useState(null)
  const [tracks, setTracks] = useState([])
  const [reviews, setReviews] = useState([])
  const [userReview, setUserReview] = useState(null)
  const [avgRating, setAvgRating] = useState(null)
  const [playingTrack, setPlayingTrack] = useState(null)
  const [loadingAlbum, setLoadingAlbum] = useState(true)
  const [artistInfo, setArtistInfo] = useState(null)
  const [artistSpotifyId, setArtistSpotifyId] = useState(null)

  // Form state
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')

  // Fetch album from iTunes
  useEffect(() => {
    if (!id) return
    Promise.all([
      fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song&limit=30`).then(r => r.json()),
    ]).then(([itunesData]) => {
      const results = itunesData.results || []
      const albumInfo = results.find(r => r.wrapperType === 'collection') || results[0]
      if (albumInfo) {
        setAlbum({
          id: String(id),
          title: albumInfo.collectionName || albumInfo.trackName,
          artist: albumInfo.artistName,
          image: (albumInfo.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
          year: albumInfo.releaseDate ? new Date(albumInfo.releaseDate).getFullYear() : '—',
          genre: albumInfo.primaryGenreName || '',
          trackCount: albumInfo.trackCount || 0,
        })
      }
      const songs = results
        .filter(r => r.wrapperType === 'track')
        .map(t => ({
          id: t.trackId,
          name: t.trackName,
          duration: t.trackTimeMillis,
          preview: t.previewUrl || '',
          image: (t.artworkUrl100 || '').replace('100x100bb', '300x300bb'),
          artist: t.artistName,
          trackNumber: t.trackNumber,
        }))
        .sort((a, b) => a.trackNumber - b.trackNumber)
      setTracks(songs)
      setLoadingAlbum(false)
    }).catch(() => setLoadingAlbum(false))
  }, [id])

  useEffect(() => {
    if (!album?.artist) return
    fetch(`/api/artist/info?name=${encodeURIComponent(album.artist)}`)
      .then(r => r.json())
      .then(data => setArtistInfo(data.result))
      .catch(() => setArtistInfo(null))
  }, [album?.artist])

  useEffect(() => {
    if (!album?.artist || !id) return

    async function resolveArtistId() {
      // 1. Revisar si ya lo tenemos guardado en Supabase
      const { data: existing } = await supabase
        .from('albums')
        .select('artist_spotify_id')
        .eq('album_id', String(id))
        .single()

      if (existing?.artist_spotify_id) {
        setArtistSpotifyId(existing.artist_spotify_id)
        return
      }

      // 2. Si no lo tenemos, preguntarle a Spotify UNA vez y guardarlo
      try {
        const res = await fetch(`/api/artist?q=${encodeURIComponent(album.artist)}`)
        const data = await res.json()
        const foundId = data.artists?.[0]?.id || null
        setArtistSpotifyId(foundId)

        if (foundId) {
          await supabase.from('albums').update({ artist_spotify_id: foundId }).eq('album_id', String(id))
        }
      } catch {
        setArtistSpotifyId(null)
      }
    }

    resolveArtistId()
  }, [album?.artist, id])

  useEffect(() => {
    if (!id) return
    fetchReviews()
  }, [id])

  async function fetchReviews() {
    const albumId = String(id)

    const { data } = await supabase
      .from('reviews')
      .select('*, profiles!reviews_user_id_fkey(username, display_name, avatar_url)')
      .eq('album_id', albumId)
      .order('created_at', { ascending: false })

    if (data) {
      setReviews(data)
      if (user) {
        const mine = data.find(r => r.user_id === user.id)
        if (mine) { setUserReview(mine); setRating(mine.rating); setBody(mine.body) }
      }
      if (data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length
        setAvgRating(avg.toFixed(1))
      }
    }
  }

  // Upsert album en Supabase (para que exista la FK)
  async function ensureAlbumExists() {
    if (!album) return
    await supabase.from('albums').upsert({
      album_id: String(id),
      title: album.title,
      artist: album.artist,
      cover_url: album.image,
      release_year: album.year !== '—' ? parseInt(album.year) : null,
      genre: album.genre,
    }, { onConflict: 'album_id' })
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!user) { router.push('/login'); return }
    if (rating === 0) { setSubmitMsg('Por favor selecciona una calificación'); return }
    if (body.trim().length < 10) { setSubmitMsg('Escribe al menos 10 caracteres'); return }

    setSubmitting(true)
    setSubmitMsg('')

    await ensureAlbumExists()

    const reviewData = {
      user_id: user.id,
      album_id: String(id),
      body: body.trim(),
      rating,
    }

    let error
    if (userReview) {
      const res = await supabase.from('reviews').update(reviewData).eq('id', userReview.id)
      error = res.error
    } else {
      const res = await supabase.from('reviews').insert(reviewData)
      error = res.error
    }

    if (error) {
      setSubmitMsg('Error al guardar: ' + error.message)
    } else {
      setSubmitMsg('✓ Reseña guardada')
      await fetchReviews()

      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          body: body.trim(),
          albumId: String(id),
          type: 'review',
          review: {
            body: body.trim(),
            rating,
            albumTitle: album?.title,
            albumArtist: album?.artist,
            albumId: String(id),
            coverUrl: album?.image,
          },
        }),
      })

      const { data: updatedAlbum } = await supabase
        .from('albums')
        .select('avg_rating, total_ratings')
        .eq('album_id', String(id))
        .single()

      if (updatedAlbum) {
        setAvgRating(updatedAlbum.avg_rating?.toFixed(1) || null)
      }
    }
    setSubmitting(false)
  }

  const fmt = (ms) => ms ? `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}` : '—'

  if (loadingAlbum) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>Cargando álbum...</div>
    </div>
  )

  if (!album) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎵</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: 'var(--text)' }}>Álbum no encontrado</div>
        <Link href="/albums" style={{ color: 'var(--gold)', marginTop: 16, display: 'block' }}>← Volver a búsqueda</Link>
      </div>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: playingTrack ? 80 : 40 }}>

      <Navbar activePage="/albums" />

      {/* HERO ALBUM */}
      <div style={{
        paddingTop: 100, paddingBottom: 48,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Blurred bg */}
        {album.image && (
          <>
            <div style={{
              position: 'absolute', inset: 0, zIndex: 0,
              backgroundImage: `url(${album.image})`,
              backgroundSize: 'cover', backgroundPosition: 'center',
              filter: 'blur(60px) saturate(0.5)',
              opacity: 0.15, transform: 'scale(1.1)',
            }} />
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to bottom, rgba(8,8,8,0.7) 0%, rgba(8,8,8,0.95) 100%)' }} />
          </>
        )}

        <div className="album-hero-inner" style={{ position: 'relative', zIndex: 2, maxWidth: 1100, margin: '0 auto', padding: '0 48px', display: 'flex', gap: 48, alignItems: 'flex-start' }}>

          {/* Cover */}
          <div style={{ flexShrink: 0 }}>
            <div className="album-cover-wrap" style={{ width: 220, height: 220, borderRadius: 16, overflow: 'hidden', background: '#1a1a1a', boxShadow: '0 32px 80px rgba(0,0,0,0.8)', border: '1px solid var(--border)' }}>
              {album.image && <img src={album.image} alt={album.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />}
            </div>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
              Álbum · {album.year} · {album.genre}
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 900, color: 'var(--text)', lineHeight: 1.1, marginBottom: 10 }}>
              {album.title}
            </h1>

            {artistSpotifyId ? (
              <Link href={`/artist/${artistSpotifyId}`} style={{ fontSize: 18, color: 'var(--muted)', marginBottom: 8, display: 'inline-block', textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.color = 'var(--gold)'}
                onMouseLeave={e => e.target.style.color = 'var(--muted)'}
              >
                {album.artist} ↗
              </Link>
            ) : (
              <div style={{ fontSize: 18, color: 'var(--muted)', marginBottom: 8 }}>{album.artist}</div>
            )}

            {artistInfo?.realName && (
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                Nombre real: <span style={{ color: 'var(--text)' }}>{artistInfo.realName}</span>
              </div>
            )}

            {artistInfo?.members?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Integrantes principales</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: artistInfo.otherMembers?.length > 0 ? 10 : 0 }}>
                  {artistInfo.members.map((m, i) => (
                    <span key={i} style={{
                      fontSize: 12, color: 'var(--text)',
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 100, padding: '4px 12px',
                    }}>
                      {m.name}
                    </span>
                  ))}
                </div>

                {artistInfo.otherMembers?.length > 0 && (
                  <details style={{ marginTop: 4 }}>
                    <summary style={{ fontSize: 11, color: 'var(--muted)', cursor: 'pointer', userSelect: 'none' }}>
                      Ver colaboradores adicionales ({artistInfo.otherMembers.length})
                    </summary>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      {artistInfo.otherMembers.map((m, i) => (
                        <span key={i} style={{
                          fontSize: 12, color: 'var(--muted)',
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          borderRadius: 100, padding: '4px 12px',
                        }}>
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="album-stats-row" style={{ display: 'flex', gap: 32 }}>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 500, color: avgRating ? 'var(--gold)' : 'var(--muted)' }}>
                  {avgRating || '—'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Calificación promedio</div>
              </div>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 500, color: 'var(--text)' }}>{reviews.length}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Reseñas</div>
              </div>
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 26, fontWeight: 500, color: 'var(--text)' }}>{tracks.length}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Canciones</div>
              </div>
            </div>
            <button
              onClick={() => {
                const params = new URLSearchParams({
                  album_id: String(id),
                  album_name: album.title,
                  album_artist: album.artist,
                  album_image: album.image,
                })
                router.push(`/feed?${params.toString()}`)
              }}
              style={{
                marginTop: 20,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'var(--gold-dim)', border: '1px solid rgba(232,197,71,0.25)',
                borderRadius: 100, padding: '9px 18px',
                color: 'var(--gold)', fontSize: 13, fontWeight: 600,
                fontFamily: "'Inter', sans-serif", cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.target.style.background = 'rgba(232,197,71,0.15)' }}
              onMouseLeave={e => { e.target.style.background = 'var(--gold-dim)' }}
            >
              <span>↗</span> Compartir en el feed
            </button>
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="section-padded" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>
        <div className="album-content-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 48 }}>

          {/* LEFT: TRACKLIST + REVIEWS */}
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>
              Canciones
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              {tracks.map((track, i) => (
                <div
                  key={track.id}
                  onClick={() => track.preview && setPlayingTrack(track)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '12px 20px',
                    borderBottom: i < tracks.length - 1 ? '1px solid var(--border)' : 'none',
                    background: playingTrack?.id === track.id ? 'rgba(232,197,71,0.05)' : 'transparent',
                    cursor: track.preview ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (track.preview && playingTrack?.id !== track.id) e.currentTarget.style.background = '#161616' }}
                  onMouseLeave={e => { if (playingTrack?.id !== track.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: 28, textAlign: 'center', flexShrink: 0 }}>
                    {playingTrack?.id === track.id
                      ? <span style={{ color: 'var(--gold)' }}>▶</span>
                      : <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>{String(i + 1).padStart(2, '0')}</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: playingTrack?.id === track.id ? 'var(--gold)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {track.name}
                    </div>
                  </div>
                  {track.preview && (
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--gold)', border: '1px solid rgba(232,197,71,0.3)', borderRadius: 3, padding: '1px 5px', flexShrink: 0 }}>▶ 30s</span>
                  )}
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>{fmt(track.duration)}</div>
                </div>
              ))}
            </div>

            {/* LISTA DE RESEÑAS */}
            <div style={{ marginTop: 32 }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10, color: 'var(--gold)',
                letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16
              }}>
                Reseñas ({reviews.length})
              </div>
              {reviews.length === 0 ? (
                <div style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 14, padding: '28px 22px', textAlign: 'center',
                }}>
                  <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
                    Este álbum aún no tiene reseñas.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {reviews.map(r => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: REVIEW FORM */}
          <div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>
              {userReview ? 'Tu reseña' : 'Escribe una reseña'}
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px', marginBottom: 32 }}>
              {!user ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>Inicia sesión para dejar tu reseña</div>
                  <Link href="/login" className="btn-gold-sm">Iniciar sesión</Link>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview}>
                  <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Tu calificación</div>
                    <StarPicker value={rating} onChange={setRating} />
                  </div>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="¿Qué te pareció este álbum? Comparte tu opinión..."
                    rows={4}
                    style={{
                      width: '100%', padding: '14px',
                      background: 'var(--bg)', border: '1px solid var(--border)',
                      borderRadius: 10, color: 'var(--text)',
                      fontSize: 14, fontFamily: "'Inter', sans-serif",
                      resize: 'vertical', outline: 'none', lineHeight: 1.6,
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(232,197,71,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                  {submitMsg && (
                    <div style={{ fontSize: 12, color: submitMsg.startsWith('✓') ? 'var(--gold)' : '#f87171', marginTop: 8 }}>{submitMsg}</div>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      marginTop: 14, width: '100%', padding: '13px',
                      background: submitting ? 'rgba(232,197,71,0.4)' : 'var(--gold)',
                      border: 'none', borderRadius: 10, color: '#000',
                      fontWeight: 700, fontSize: 14, fontFamily: "'Inter', sans-serif",
                      cursor: submitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {submitting ? 'Guardando...' : userReview ? 'Actualizar reseña' : 'Publicar reseña'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {playingTrack && <MiniPlayer track={playingTrack} onClose={() => setPlayingTrack(null)} />}
    </div>
  )
}