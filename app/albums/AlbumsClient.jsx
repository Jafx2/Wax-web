'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useAuth } from '../components/AuthProvider'
import Navbar from '../components/Navbar'

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
    const pct = (e.clientX - rect.left) / rect.width
    audio.currentTime = pct * (audio.duration || 30)
  }

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  if (!track) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(12,12,12,0.97)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid var(--border)',
      padding: '12px 48px',
      display: 'flex', alignItems: 'center', gap: 20,
    }}>
      <audio ref={audioRef} />

      {/* Portada */}
      <div style={{ width: 44, height: 44, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#1a1a1a' }}>
        {track.image && <img src={track.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />}
      </div>

      {/* Info */}
      <div style={{ minWidth: 0, flex: '0 0 200px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{track.artist}</div>
      </div>

      {/* Controls */}
      <button onClick={toggle} style={{
        width: 38, height: 38, borderRadius: '50%',
        background: 'var(--gold)', border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 14, color: '#000',
      }}>
        {playing ? '⏸' : '▶'}
      </button>

      {/* Progress */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>{fmt(currentTime)}</span>
        <div
          onClick={seek}
          style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, cursor: 'pointer', position: 'relative' }}
        >
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--gold)', borderRadius: 2, transition: 'width 0.1s linear' }} />
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>{fmt(duration)}</span>
      </div>

      {/* Preview badge */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
        color: 'var(--muted)', border: '1px solid var(--border)',
        borderRadius: 4, padding: '2px 6px', flexShrink: 0,
      }}>PREVIEW 30s</div>

      {/* Close */}
      <button onClick={onClose} style={{
        background: 'none', border: 'none', color: 'var(--muted)',
        cursor: 'pointer', fontSize: 18, flexShrink: 0, lineHeight: 1,
      }}>×</button>
    </div>
  )
}

// ── TRACK ROW ─────────────────────────────────────────────
function TrackRow({ track, index, isPlaying, onPlay }) {
  return (
    <div
      onClick={() => track.preview && onPlay(track)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '10px 16px', borderRadius: 8,
        background: isPlaying ? 'rgba(232,197,71,0.06)' : 'transparent',
        border: isPlaying ? '1px solid rgba(232,197,71,0.15)' : '1px solid transparent',
        cursor: track.preview ? 'pointer' : 'default',
        transition: 'all 0.15s',
      }}
      className={track.preview ? 'review-card' : ''}
    >
      {/* Número / playing indicator */}
      <div style={{ width: 28, textAlign: 'center', flexShrink: 0 }}>
        {isPlaying
          ? <span style={{ color: 'var(--gold)', fontSize: 14 }}>▶</span>
          : <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>{String(index + 1).padStart(2, '0')}</span>
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500,
          color: isPlaying ? 'var(--gold)' : 'var(--text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{track.name}</div>
      </div>

      {/* Duration */}
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
        {track.duration ? `${Math.floor(track.duration / 60000)}:${String(Math.floor((track.duration % 60000) / 1000)).padStart(2, '0')}` : '—'}
      </div>

      {/* Preview badge */}
      {track.preview && !isPlaying && (
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
          color: 'var(--gold)', border: '1px solid rgba(232,197,71,0.3)',
          borderRadius: 3, padding: '1px 5px', flexShrink: 0,
        }}>▶ 30s</div>
      )}
    </div>
  )
}

// ── ALBUM CARD ────────────────────────────────────────────
function AlbumCard({ album, isExpanded, onToggle, playingTrack, onPlay }) {
  const [tracks, setTracks] = useState([])
  const [loadingTracks, setLoadingTracks] = useState(false)

useEffect(() => {
    if (!isExpanded || tracks.length > 0) return
        setLoadingTracks(true)
    fetch(`https://itunes.apple.com/lookup?id=${album.id}&entity=song&limit=25`)
    .then(r => r.json())
    .then(data => {
        const songs = (data.results || [])
        .filter(r => r.wrapperType === 'track')
        .map(t => ({
            name: t.trackName,
            duration: t.trackTimeMillis,
            preview: t.previewUrl || '',
            image: album.image,
            artist: album.artist,
            id: t.trackId,
          }))
        setTracks(songs)
        setLoadingTracks(false)
      })
      .catch(() => setLoadingTracks(false))
  }, [isExpanded])

  return (
    <Link href={`/album/${album.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}>
      {/* Album header */}
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 20, cursor: 'pointer' }}
        className="review-card"
      >
        <div style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#1a1a1a' }}>
        {album.image && <img src={album.image} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{album.year} · {album.trackCount} canciones</div>
        </div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 18, color: 'var(--muted)',
          transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s', flexShrink: 0,
        }}>›</div>
      </div>

      {/* Track list */}
      {isExpanded && (
        <div style={{ padding: '0 12px 16px', borderTop: '1px solid var(--border)' }}>
          {loadingTracks
            ? <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando canciones...</div>
            : tracks.length === 0
            ? <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>No se encontraron canciones</div>
            : tracks.map((track, i) => (
              <TrackRow
                key={track.id}
                track={track}
                index={i}
                isPlaying={playingTrack?.id === track.id}
                onPlay={onPlay}
              />
            ))
          }
        </div>
      )}
      </div>
    </Link>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────
export default function AlbumsPage() {
  const { user, profile } = useAuth()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedAlbum, setExpandedAlbum] = useState(null)
  const [playingTrack, setPlayingTrack] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)

  const search = async (q) => {
    if (!q.trim()) return
    setLoading(true)
    setHasSearched(true)
    setResults([])
    setExpandedAlbum(null)
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=20&country=US`
      )
      const data = await res.json()
      const albums = (data.results || []).map(a => ({
        id: a.collectionId,
        name: a.collectionName,
        artist: a.artistName,
        image: (a.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
        year: a.releaseDate ? new Date(a.releaseDate).getFullYear() : '—',
        trackCount: a.trackCount || 0,
        genre: a.primaryGenreName || '',
      }))
      setResults(albums)
    } catch {}
    setLoading(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') search(query)
  }

  const SUGGESTIONS = ['Gustavo Cerati', 'Soda Stereo', 'The Beatles', 'Radiohead', 'Bad Bunny', 'Taylor Swift', 'Billie Eilish', 'Kendrick Lamar']

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingBottom: playingTrack ? 80 : 0 }}>

      <Navbar activePage="/albums" />

      {/* SEARCH HERO */}
    <div style={{ paddingTop: 120, paddingBottom: 60, paddingLeft: 48, paddingRight: 48, maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
        Explorar
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(36px, 5vw, 60px)', fontWeight: 900, color: 'var(--text)', marginBottom: 36, lineHeight: 1.1 }}>
        Encuentra <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>tu música.</em>
        </h1>

        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
        <span style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--muted)' }}>🔍</span>
        <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Buscar artista, álbum..."
            style={{
            width: '100%', padding: '18px 20px 18px 52px',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, color: 'var(--text)',
            fontSize: 16, fontFamily: "'Inter', sans-serif",
            outline: 'none', transition: 'border-color 0.2s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(232,197,71,0.4)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
            onClick={() => search(query)}
            style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'var(--gold)', border: 'none', borderRadius: 10,
            padding: '10px 20px', color: '#000', fontWeight: 600,
            fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            }}
        >Buscar</button>
        </div>

        {/* Suggestions */}
        {!hasSearched && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>Prueba:</span>
            {SUGGESTIONS.map(s => (
            <button
                key={s}
                onClick={() => { setQuery(s); search(s) }}
                style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 100, padding: '6px 14px',
                color: 'var(--muted)', fontSize: 12, cursor: 'pointer',
                fontFamily: "'Inter', sans-serif", transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.target.style.borderColor = 'rgba(232,197,71,0.3)'; e.target.style.color = 'var(--text)' }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--muted)' }}
            >{s}</button>
            ))}
        </div>
        )}

        {/* Results */}
        {loading && (
        <div style={{ paddingTop: 48, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 104, borderRadius: 16, background: '#1a1a1a' }} className="skeleton" />
            ))}
        </div>
        )}

        {!loading && hasSearched && results.length === 0 && (
        <div style={{ paddingTop: 64, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎵</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: 'var(--text)', marginBottom: 8 }}>Sin resultados</div>
            <div style={{ fontSize: 14, color: 'var(--muted)' }}>Prueba con otro nombre de artista o álbum</div>
        </div>
        )}

        {!loading && results.length > 0 && (
        <div style={{ marginTop: 36 }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>
            {results.length} álbumes encontrados
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map(album => (
                <AlbumCard
            key={album.id}
            album={album}
            isExpanded={expandedAlbum === album.id}
            onToggle={() => setExpandedAlbum(expandedAlbum === album.id ? null : album.id)}
            playingTrack={playingTrack}
            onPlay={(track) => setPlayingTrack(track)}
                />
            ))}
            </div>
        </div>
        )}
    </div>

      {/* MINI PLAYER */}
    {playingTrack && (
        <MiniPlayer
        track={playingTrack}
        onClose={() => setPlayingTrack(null)}
        />
    )}
    </div>
)
}