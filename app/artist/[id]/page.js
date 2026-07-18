'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useAuth } from '../../components/AuthProvider'

// ── MINI PLAYER ───────────────────────────────────────────
function MiniPlayer({ track, onClose }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(30)

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
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnd)
      audio.pause()
    }
  }, [track])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play(); setPlaying(true) }
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
    <div className="artist-miniplayer" style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(8,8,8,0.97)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)', padding: '12px 48px',
      display: 'flex', alignItems: 'center', gap: 20,
    }}>
      <audio ref={audioRef} />
      <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#1a1a1a' }}>
        {track.image && <img src={track.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />}
      </div>
      <div className="artist-miniplayer-info" style={{ minWidth: 0, flex: '0 0 220px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{track.albumName}</div>
      </div>
      <button onClick={toggle} style={{
        width: 38, height: 38, borderRadius: '50%', background: 'var(--gold)',
        border: 'none', cursor: 'pointer', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, color: '#000',
      }}>
        {playing ? '⏸' : '▶'}
      </button>
      <div className="artist-miniplayer-progress" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>{fmt(currentTime)}</span>
        <div onClick={seek} style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, cursor: 'pointer' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--gold)', borderRadius: 2, transition: 'width 0.1s linear' }} />
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>{fmt(duration)}</span>
      </div>
      <div className="artist-miniplayer-badge" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--muted)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', flexShrink: 0 }}>PREVIEW 30s</div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20, flexShrink: 0 }}>×</button>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────
export default function ArtistPage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [playingTrack, setPlayingTrack] = useState(null)
  const [activeTab, setActiveTab] = useState('canciones')

  useEffect(() => {
    if (!id) return
    fetch(`/api/artist?id=${id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const fmt = (ms) => ms ? `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}` : '—'
  const fmtFollowers = (n) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>Cargando artista...</div>
    </div>
  )

  if (!data?.artist) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: 'var(--text)', marginBottom: 16 }}>Artista no encontrado</div>
        <Link href="/" style={{ color: 'var(--gold)' }}>← Inicio</Link>
      </div>
    </div>
  )

  const { artist, topTracks, albums } = data
  const albumsOnly = albums.filter(a => a.type === 'album')
  const singles = albums.filter(a => a.type === 'single')

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: playingTrack ? 80 : 40 }}>

      {/* NAV */}
      <nav className="artist-nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 48px', background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 13, color: '#000' }}>W</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 700, color: 'var(--text)' }}>Wax</span>
        </Link>
        <div className="artist-nav-links" style={{ display: 'flex', gap: 32 }}>
          {[{ label: 'Álbumes', href: '/albums' }, { label: 'Feed', href: '/feed' }, { label: 'Amigos', href: '/friends' }].map(({ label, href }) => (
            <Link key={href} href={href} className="nav-link">{label}</Link>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {user && profile ? (
            <Link href={`/profile/${profile.username}`} className="artist-nav-user" style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 100, padding: '7px 14px 7px 8px' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid rgba(232,197,71,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: 12, fontWeight: 700, color: 'var(--gold)', overflow: 'hidden' }}>
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : (profile.display_name || profile.username || '?')[0].toUpperCase()}
              </div>
              <span className="artist-nav-username" style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>@{profile.username}</span>
            </Link>
          ) : (
            <>
              <Link href="/login" className="nav-link" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>Iniciar sesión</Link>
              <Link href="/register" className="btn-gold-sm">Crear cuenta</Link>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <div style={{ position: 'relative', paddingTop: 80 }}>
        {/* Imagen de fondo blureada */}
        {artist.image && (
          <>
            <div style={{
              position: 'absolute', inset: 0, zIndex: 0,
              backgroundImage: `url(${artist.image})`,
              backgroundSize: 'cover', backgroundPosition: 'center top',
              filter: 'blur(40px) saturate(0.4)',
              opacity: 0.25, transform: 'scale(1.1)',
            }} />
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, background: 'linear-gradient(to bottom, rgba(8,8,8,0.5) 0%, rgba(8,8,8,0.95) 100%)' }} />
          </>
        )}

        <div className="artist-hero-inner" style={{ position: 'relative', zIndex: 2, maxWidth: 1100, margin: '0 auto', padding: '48px 48px 40px', display: 'flex', gap: 48, alignItems: 'flex-end' }}>
          {/* Foto */}
          <div className="artist-photo-wrap" style={{ flexShrink: 0 }}>
            <div className="artist-photo" style={{
              width: 200, height: 200, borderRadius: '50%',
              overflow: 'hidden', background: '#1a1a1a',
              border: '3px solid rgba(232,197,71,0.2)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
            }}>
              {artist.image
                ? <img src={artist.image} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, color: 'var(--muted)' }}>♪</div>
              }
            </div>
          </div>

          {/* Info */}
          <div className="artist-info" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
              Artista · Spotify
            </div>
            <h1 className="artist-title" style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(40px, 6vw, 72px)',
              fontWeight: 900, lineHeight: 1.0,
              letterSpacing: '-0.02em', color: 'var(--text)',
              marginBottom: 16,
            }}>{artist.name}</h1>

            {/* Géneros */}
            {artist.genres.length > 0 && (
              <div className="artist-genres" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {artist.genres.slice(0, 4).map(g => (
                  <span key={g} style={{
                    fontSize: 11, color: 'var(--muted)',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 100, padding: '4px 10px',
                    textTransform: 'capitalize',
                  }}>{g}</span>
                ))}
              </div>
            )}
            {data.musicbrainzInfo && (data.musicbrainzInfo.realName || data.musicbrainzInfo.country || data.musicbrainzInfo.beginDate) && (
              <div className="artist-mb-info" style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {data.musicbrainzInfo.realName && (
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    Nombre real: <span style={{ color: 'var(--text)' }}>{data.musicbrainzInfo.realName}</span>
                  </div>
                )}
                {data.musicbrainzInfo.country && (
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    País: <span style={{ color: 'var(--text)' }}>{data.musicbrainzInfo.country}</span>
                  </div>
                )}
                {data.musicbrainzInfo.beginDate && (
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                    {data.musicbrainzInfo.type === 'Person' ? 'Activo desde' : 'Formada en'}: <span style={{ color: 'var(--text)' }}>{data.musicbrainzInfo.beginDate.slice(0, 4)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="artist-stats-row" style={{ display: 'flex', gap: 36 }}>
              {artist.followers > 0 && (
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 500, color: 'var(--text)' }}>
                    {fmtFollowers(artist.followers)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>seguidores en Spotify</div>
                </div>
              )}
              {artist.popularity > 0 && (
                <div>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, fontWeight: 500, color: artist.popularity > 70 ? 'var(--gold)' : 'var(--text)' }}>
                    {artist.popularity}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>popularidad</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="artist-content" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 48px' }}>

        {/* Tabs */}
        <div className="artist-tabs" style={{ borderBottom: '1px solid var(--border)', marginBottom: 32, display: 'flex', gap: 0 }}>
          {[
            { id: 'canciones', label: `Top canciones` },
            { id: 'albumes', label: `Álbumes (${albumsOnly.length})` },
            { id: 'singles', label: `Singles (${singles.length})` },
            { id: 'info', label: `Info` },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="artist-tab-btn" style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '14px 20px', fontSize: 14, fontWeight: 600,
              color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)',
              borderBottom: activeTab === tab.id ? '2px solid var(--gold)' : '2px solid transparent',
              marginBottom: -1, fontFamily: "'Inter', sans-serif", transition: 'color 0.2s',
            }}>{tab.label}</button>
          ))}
        </div>

        {/* TOP CANCIONES */}
        {activeTab === 'canciones' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {topTracks.map((track, i) => (
              <div
                key={track.id}
                onClick={() => track.preview && setPlayingTrack(playingTrack?.id === track.id ? null : track)}
                className="artist-track-row"
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '10px 16px', borderRadius: 10,
                  background: playingTrack?.id === track.id ? 'rgba(232,197,71,0.05)' : 'transparent',
                  border: playingTrack?.id === track.id ? '1px solid rgba(232,197,71,0.12)' : '1px solid transparent',
                  cursor: track.preview ? 'pointer' : 'default',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (playingTrack?.id !== track.id) e.currentTarget.style.background = '#111' }}
                onMouseLeave={e => { if (playingTrack?.id !== track.id) e.currentTarget.style.background = 'transparent' }}
              >
                {/* Número */}
                <div className="artist-track-number" style={{ width: 28, textAlign: 'center', flexShrink: 0 }}>
                  {playingTrack?.id === track.id
                    ? <span style={{ color: 'var(--gold)', fontSize: 14 }}>▶</span>
                    : <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--muted)' }}>{String(i + 1).padStart(2, '0')}</span>
                  }
                </div>

                {/* Portada */}
                <div className="artist-track-cover" style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#1a1a1a' }}>
                  {track.image && <img src={track.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="artist-track-name" style={{
                    fontSize: 15, fontWeight: 600,
                    color: playingTrack?.id === track.id ? 'var(--gold)' : 'var(--text)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{track.name}</div>
                  <div className="artist-track-album" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{track.albumName}</div>
                </div>

                {/* Popularidad */}
                <div className="artist-track-popularity" style={{ flexShrink: 0, width: 80 }}>
                  <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${track.popularity}%`, height: '100%', background: track.popularity > 70 ? 'var(--gold)' : 'var(--muted-light)', borderRadius: 2 }} />
                  </div>
                </div>

                {/* Preview badge */}
                {track.preview && playingTrack?.id !== track.id && (
                  <div className="artist-track-badge" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: 'var(--gold)', border: '1px solid rgba(232,197,71,0.3)', borderRadius: 3, padding: '2px 6px', flexShrink: 0 }}>▶ 30s</div>
                )}

                {/* Duración */}
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)', flexShrink: 0, width: 40, textAlign: 'right' }}>
                  {fmt(track.duration)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ÁLBUMES */}
        {(activeTab === 'albumes' || activeTab === 'singles') && (
          <div className="artist-albums-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 20 }}>
            {(activeTab === 'albumes' ? albumsOnly : singles).map(album => (
              <Link key={album.id} href={`/album/${album.id}`} style={{ display: 'block' }}>
                <div className="album-card" style={{ cursor: 'pointer' }}>
                  <div style={{
                    aspectRatio: '1', borderRadius: 10, overflow: 'hidden',
                    background: '#1a1a1a', border: '1px solid var(--border)',
                    marginBottom: 10, position: 'relative',
                  }}>
                    {album.image
                      ? <img src={album.image} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} referrerPolicy="no-referrer" />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: 'var(--muted)' }}>♫</div>
                    }
                    <div className="album-overlay">
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>
                        <span style={{ fontSize: 16, marginLeft: 3 }}>▶</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, fontFamily: "'JetBrains Mono', monospace" }}>
                    {album.year} · {album.totalTracks} canciones
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* INFO */}
        {activeTab === 'info' && (
          <div style={{ maxWidth: 640 }}>
            {!data.musicbrainzInfo ? (
              <div style={{ fontSize: 14, color: 'var(--muted)' }}>No hay información adicional disponible.</div>
            ) : (
              <>
                {/* Estado */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: data.musicbrainzInfo.ended ? '#f87171' : '#4ade80',
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                    {data.musicbrainzInfo.ended
                      ? (data.musicbrainzInfo.type === 'Person' ? 'Fallecido/a' : 'Separada / Finalizada')
                      : 'Activo'}
                  </span>
                  {data.musicbrainzInfo.endDate && (
                    <span style={{ fontSize: 12, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                      · {data.musicbrainzInfo.endDate.slice(0, 4)}
                    </span>
                  )}
                </div>

                {/* Biografía */}
                {data.musicbrainzInfo.wiki?.extract && (
                  <div style={{ marginBottom: 32 }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
                      Biografía
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.75, marginBottom: 12 }}>
                      {data.musicbrainzInfo.wiki.extract}
                    </p>
                    {data.musicbrainzInfo.wiki.url && (
                      <a href={data.musicbrainzInfo.wiki.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--gold)' }}>
                        Leer más en Wikipedia →
                      </a>
                    )}
                  </div>
                )}

                {/* Datos básicos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                  {data.musicbrainzInfo.realName && (
                    <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                      Nombre real: <span style={{ color: 'var(--text)' }}>{data.musicbrainzInfo.realName}</span>
                    </div>
                  )}
                  {data.musicbrainzInfo.country && (
                    <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                      País: <span style={{ color: 'var(--text)' }}>{data.musicbrainzInfo.country}</span>
                    </div>
                  )}
                  {data.musicbrainzInfo.beginDate && (
                    <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                      {data.musicbrainzInfo.type === 'Person' ? 'Nacimiento / inicio' : 'Formada en'}: <span style={{ color: 'var(--text)' }}>{data.musicbrainzInfo.beginDate.slice(0, 4)}</span>
                    </div>
                  )}
                  {data.musicbrainzInfo.type === 'Group' && (
                    <div style={{ fontSize: 14, color: 'var(--muted)' }}>
                      Integrantes: <span style={{ color: 'var(--text)' }}>{data.musicbrainzInfo.members.length + data.musicbrainzInfo.otherMembers.length}</span>
                    </div>
                  )}
                </div>

                {/* Integrantes detallados */}
                {data.musicbrainzInfo.members.length > 0 && (
                  <div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
                      Integrantes principales
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: data.musicbrainzInfo.otherMembers.length > 0 ? 16 : 0 }}>
                      {data.musicbrainzInfo.members.map((m, i) => (
                        <span key={i} style={{
                          fontSize: 13, color: 'var(--text)',
                          background: 'var(--surface)', border: '1px solid var(--border)',
                          borderRadius: 100, padding: '6px 14px',
                        }}>{m.name}</span>
                      ))}
                    </div>
                    {data.musicbrainzInfo.otherMembers.length > 0 && (
                      <details>
                        <summary style={{ fontSize: 12, color: 'var(--muted)', cursor: 'pointer' }}>
                          Ver colaboradores adicionales ({data.musicbrainzInfo.otherMembers.length})
                        </summary>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                          {data.musicbrainzInfo.otherMembers.map((m, i) => (
                            <span key={i} style={{
                              fontSize: 12, color: 'var(--muted)',
                              background: 'var(--surface)', border: '1px solid var(--border)',
                              borderRadius: 100, padding: '5px 12px',
                            }}>{m.name}</span>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>

      {playingTrack && <MiniPlayer track={playingTrack} onClose={() => setPlayingTrack(null)} />}

      <style jsx global>{`
        @media (max-width: 768px) {
          .artist-nav {
            padding: 12px 16px !important;
          }
          .artist-nav-links {
            gap: 14px !important;
          }
          .artist-nav-links a {
            font-size: 12px !important;
          }
          .artist-nav-username {
            display: none !important;
          }

          .artist-hero-inner {
            flex-direction: column !important;
            align-items: center !important;
            text-align: center !important;
            padding: 20px 16px 28px !important;
            gap: 20px !important;
          }
          .artist-photo {
            width: 130px !important;
            height: 130px !important;
          }
          .artist-info {
            width: 100% !important;
          }
          .artist-title {
            font-size: 32px !important;
            margin-bottom: 10px !important;
          }
          .artist-genres {
            justify-content: center !important;
            margin-bottom: 14px !important;
          }
          .artist-mb-info {
            align-items: center !important;
            margin-bottom: 14px !important;
          }
          .artist-stats-row {
            justify-content: center !important;
            gap: 24px !important;
          }

          .artist-content {
            padding: 0 16px !important;
          }
          .artist-tabs {
            gap: 0 !important;
            overflow-x: auto !important;
            white-space: nowrap !important;
          }
          .artist-tab-btn {
            padding: 12px 12px !important;
            font-size: 13px !important;
            flex-shrink: 0 !important;
          }

          .artist-track-row {
            gap: 10px !important;
            padding: 8px 8px !important;
          }
          .artist-track-cover {
            width: 36px !important;
            height: 36px !important;
          }
          .artist-track-name {
            font-size: 13px !important;
          }
          .artist-track-album {
            font-size: 11px !important;
          }
          .artist-track-popularity {
            display: none !important;
          }
          .artist-track-badge {
            display: none !important;
          }

          .artist-albums-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 12px !important;
          }
          .artist-albums-grid .album-card > div:first-child {
            max-width: 100% !important;
          }
            .artist-content {
            overflow-x: hidden !important;
          }

          .artist-miniplayer {
            padding: 10px 14px !important;
            gap: 10px !important;
          }
          .artist-miniplayer-info {
            flex: 1 1 auto !important;
            min-width: 0 !important;
          }
          .artist-miniplayer-progress {
            display: none !important;
          }
          .artist-miniplayer-badge {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}