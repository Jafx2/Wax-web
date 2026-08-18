'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'

// ── MINI PLAYER INLINE ────────────────────────────────────
function TrackPreview({ track, isPlaying, onToggle }) {
  const audioRef = useRef(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.src = track.preview
      audio.play().catch(() => { })
    } else {
      audio.pause()
      audio.currentTime = 0
      setProgress(0)
    }
  }, [isPlaying])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setProgress((audio.currentTime / (audio.duration || 30)) * 100)
    const onEnd = () => { setProgress(0); onToggle(null) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd) }
  }, [])

  return (
    <>
      <audio ref={audioRef} />
      {isPlaying && (
        <div style={{ marginTop: 8, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--gold)', borderRadius: 2, transition: 'width 0.1s linear' }} />
        </div>
      )}
    </>
  )
}

// ── VINYL GHOST ICON (usado en los tiles vacíos) ──────────
function VinylGhost({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke="var(--muted)" strokeWidth="1.4" strokeDasharray="3 4" opacity="0.6" />
      <circle cx="24" cy="24" r="14" stroke="var(--muted)" strokeWidth="1" opacity="0.35" />
      <circle cx="24" cy="24" r="3.2" fill="var(--muted)" opacity="0.45" />
    </svg>
  )
}

// ── ALBUM SEARCH (tile fantasma → se abre a buscador) ─────
function AlbumPicker({ label, value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const wrapRef = useRef(null)

  const search = async (q) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=album&limit=6&country=US`)
    const data = await res.json()
    setResults((data.results || []).map(a => ({
      id: String(a.collectionId),
      name: a.collectionName,
      artist: a.artistName,
      image: (a.artworkUrl100 || '').replace('100x100bb', '300x300bb'),
      year: a.releaseDate ? new Date(a.releaseDate).getFullYear() : '',
    })))
    setSearching(false)
  }

  useEffect(() => {
    const t = setTimeout(() => search(query), 400)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setEditing(false)
        setQuery('')
      }
    }
    if (editing) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [editing])

  if (value && !editing) {
    return (
      <div className="wax-shelf-card wax-shelf-filled">
        <img src={value.image} alt="" className="wax-shelf-cover" referrerPolicy="no-referrer" />
        <div className="wax-shelf-info">
          <div className="wax-shelf-title">{value.name}</div>
          <div className="wax-shelf-sub">{value.artist} · {value.year}</div>
        </div>
        <div className="wax-shelf-actions">
          <button className="wax-icon-btn" onClick={() => setEditing(true)} title="Cambiar">✎</button>
          <button className="wax-icon-btn" onClick={() => onChange(null)} title="Quitar">×</button>
        </div>
      </div>
    )
  }

  return (
    <div className="wax-shelf-card wax-shelf-empty" ref={wrapRef}>
      {!editing ? (
        <button className="wax-ghost-tile" onClick={() => setEditing(true)}>
          <VinylGhost />
          <span>{label}</span>
        </button>
      ) : (
        <div className="wax-search-box">
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar álbum..."
            className="wax-search-input"
          />
          {(results.length > 0 || searching) && (
            <div className="wax-search-results">
              {searching && <div className="wax-search-loading">Buscando...</div>}
              {results.map(album => (
                <div
                  key={album.id}
                  className="wax-search-result-row"
                  onClick={() => { onChange(album); setEditing(false); setQuery('') }}
                >
                  <img src={album.image} alt="" referrerPolicy="no-referrer" />
                  <div>
                    <div className="wax-result-title">{album.name}</div>
                    <div className="wax-result-sub">{album.artist} · {album.year}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── TRACK SEARCH (mismo patrón tile → buscador) ───────────
function TrackPicker({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [playingId, setPlayingId] = useState(null)
  const wrapRef = useRef(null)

  const search = async (q) => {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=6&country=US`)
    const data = await res.json()
    setResults((data.results || []).filter(t => t.previewUrl).map(t => ({
      id: String(t.trackId),
      name: t.trackName,
      artist: t.artistName,
      image: (t.artworkUrl100 || '').replace('100x100bb', '300x300bb'),
      preview: t.previewUrl,
    })))
    setSearching(false)
  }

  useEffect(() => {
    const t = setTimeout(() => search(query), 400)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    function onClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setEditing(false)
        setQuery('')
      }
    }
    if (editing) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [editing])

  if (value && !editing) {
    return (
      <div className="wax-track-card">
        <img src={value.image} alt="" className="wax-track-cover" referrerPolicy="no-referrer" />
        <div className="wax-track-info">
          <div className="wax-shelf-title">{value.name}</div>
          <div className="wax-shelf-sub">{value.artist}</div>
          <button
            className="wax-play-link"
            onClick={() => setPlayingId(playingId === value.id ? null : value.id)}
          >
            {playingId === value.id ? '⏸ Pausar' : '▶ Escuchar preview'}
          </button>
          <TrackPreview track={value} isPlaying={playingId === value.id} onToggle={setPlayingId} />
        </div>
        <div className="wax-shelf-actions">
          <button className="wax-icon-btn" onClick={() => setEditing(true)} title="Cambiar">✎</button>
          <button className="wax-icon-btn" onClick={() => { onChange(null); setPlayingId(null) }} title="Quitar">×</button>
        </div>
      </div>
    )
  }

  return (
    <div className="wax-shelf-card wax-shelf-empty wax-track-empty" ref={wrapRef}>
      {!editing ? (
        <button className="wax-ghost-tile wax-ghost-tile-wide" onClick={() => setEditing(true)}>
          <VinylGhost size={28} />
          <span>Añadir canción favorita</span>
        </button>
      ) : (
        <div className="wax-search-box">
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar canción..."
            className="wax-search-input"
          />
          {(results.length > 0 || searching) && (
            <div className="wax-search-results">
              {searching && <div className="wax-search-loading">Buscando...</div>}
              {results.map(track => (
                <div key={track.id} className="wax-search-result-row wax-track-result">
                  <img src={track.image} alt="" referrerPolicy="no-referrer" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="wax-result-title">{track.name}</div>
                    <div className="wax-result-sub">{track.artist}</div>
                  </div>
                  <div className="wax-track-result-actions">
                    <button
                      className="wax-mini-btn"
                      onClick={(e) => { e.stopPropagation(); setPlayingId(playingId === track.id ? null : track.id) }}
                    >
                      {playingId === track.id ? '⏸' : '▶'}
                    </button>
                    <button
                      className="wax-mini-btn wax-mini-btn-gold"
                      onClick={() => { onChange(track); setEditing(false); setQuery(''); setPlayingId(null) }}
                    >
                      Elegir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── MAIN SETUP PAGE ───────────────────────────────────────
export default function SetupPage() {
  const router = useRouter()
  const { user, profile, loading, setProfile } = useAuth()
  const [album1, setAlbum1] = useState(null)
  const [album2, setAlbum2] = useState(null)
  const [track, setTrack] = useState(null)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const favoritesLoaded = useRef(false)

  const needsUsername = user && !loading && !profile?.username

  useEffect(() => {
    if (!loading && !user && typeof window !== 'undefined') {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (needsUsername && user && !displayName) {
      const name = user.user_metadata?.full_name || user.user_metadata?.name
      if (name) setDisplayName(name)
    }
  }, [needsUsername, user, displayName])

  useEffect(() => {
    if (profile?.display_name && !displayName) {
      setDisplayName(profile.display_name)
    }
  }, [profile, displayName])

  useEffect(() => {
    if (profile?.username && !username) {
      setUsername(profile.username)
    }
  }, [profile, username])

  // ── PRECARGA de álbumes/canción favoritos ya guardados ──
  // Corre una sola vez cuando el perfil llega, para no pisar
  // lo que el usuario esté editando en la sesión actual.
  useEffect(() => {
    if (!profile || favoritesLoaded.current) return
    favoritesLoaded.current = true

    async function loadFavorites() {
      const ids = [profile.favorite_album_id, profile.favorite_album_2_id].filter(Boolean)

      if (ids.length > 0) {
        const { data: albums } = await supabase
          .from('albums')
          .select('album_id, title, artist, cover_url, release_year')
          .in('album_id', ids)

        if (albums) {
          const found1 = albums.find(a => a.album_id === profile.favorite_album_id)
          const found2 = albums.find(a => a.album_id === profile.favorite_album_2_id)

          if (found1) {
            setAlbum1({
              id: found1.album_id,
              name: found1.title,
              artist: found1.artist,
              image: found1.cover_url,
              year: found1.release_year,
            })
          }
          if (found2) {
            setAlbum2({
              id: found2.album_id,
              name: found2.title,
              artist: found2.artist,
              image: found2.cover_url,
              year: found2.release_year,
            })
          }
        }
      }

      if (profile.favorite_track) {
        setTrack(profile.favorite_track)
      }
    }

    loadFavorites()
  }, [profile])

  const inputStyle = {
    width: '100%', padding: '14px 16px',
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 10, color: 'var(--text)',
    fontSize: 15, fontFamily: "'Inter', sans-serif", outline: 'none',
  }

  const handleUsernameSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle()

    if (existing && existing.id !== user.id) {
      setError('Ese nombre de usuario ya está en uso')
      setSaving(false)
      return
    }

    const { data, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: username.toLowerCase(),
        display_name: displayName || username,
      })
      .select()
      .maybeSingle()

    if (profileError) {
      setError(profileError.message)
      setSaving(false)
      return
    }

    setProfile(data)
    setSaving(false)
  }

  const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
  const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB, igual al límite del bucket

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      setError('Solo se permiten imágenes JPG, PNG o WebP')
      e.target.value = ''
      return
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setError('La imagen no puede pesar más de 5MB')
      e.target.value = ''
      return
    }

    setError('')
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function uploadAvatar() {
    if (!avatarFile) return profile?.avatar_url || null
    setUploadingAvatar(true)
    const ext = avatarFile.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, avatarFile, { upsert: true })

    if (uploadError) {
      setError('Error subiendo la foto: ' + uploadError.message)
      setUploadingAvatar(false)
      return profile?.avatar_url || null
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    setUploadingAvatar(false)
    return data.publicUrl
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')

    if (username && username.toLowerCase() !== profile?.username) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle()

      if (existing && existing.id !== user.id) {
        setError('Ese nombre de usuario ya está en uso')
        setSaving(false)
        return
      }
    }

    const avatarUrl = await uploadAvatar()

    if (album1) {
      await supabase.from('albums').upsert({
        album_id: album1.id,
        title: album1.name,
        artist: album1.artist,
        cover_url: album1.image,
        release_year: album1.year ? parseInt(album1.year) : null,
      }, { onConflict: 'album_id' })
    }

    if (album2) {
      await supabase.from('albums').upsert({
        album_id: album2.id,
        title: album2.name,
        artist: album2.artist,
        cover_url: album2.image,
        release_year: album2.year ? parseInt(album2.year) : null,
      }, { onConflict: 'album_id' })
    }

    const updates = {
      username: username ? username.toLowerCase() : profile.username,
      display_name: displayName || profile.display_name,
      avatar_url: avatarUrl,
      favorite_album_id: album1?.id || null,
      favorite_album_2_id: album2?.id || null,
      favorite_track: track ? {
        name: track.name,
        artist: track.artist,
        image: track.image,
        preview: track.preview,
        id: track.id,
      } : null,
    }

    const { error: saveError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...updates }, { onConflict: 'id' })

    if (saveError) {
      setError(saveError.message)
      setSaving(false)
    } else {
      setProfile(prev => ({ ...prev, ...updates }))
      router.push(`/profile/${updates.username}`)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Cargando...</p>
      </div>
    )
  }

  if (needsUsername) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 12, color: '#000' }}>W</div>
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Wax</span>
          </Link>

          <div style={{ marginBottom: 36, textAlign: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
              Paso 1 de 2
            </div>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 900, color: 'var(--text)', lineHeight: 1.1 }}>
              Tu <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>identidad</em>
            </h1>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 10 }}>Elige cómo te van a conocer.</p>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '36px 32px' }}>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 24, fontSize: 13, color: '#f87171' }}>{error}</div>
            )}

            <form onSubmit={handleUsernameSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>NOMBRE DE USUARIO</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 15 }}>@</span>
                  <input
                    type="text" value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="tuusuario" required minLength={3} maxLength={20}
                    style={{ ...inputStyle, paddingLeft: 32 }}
                    onFocus={e => e.target.style.borderColor = 'rgba(232,197,71,0.4)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Solo letras, números y guión bajo</div>
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>NOMBRE VISIBLE <span style={{ opacity: 0.5 }}>(opcional)</span></label>
                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                  placeholder="Tu nombre público" maxLength={40} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(232,197,71,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
              <button type="submit" disabled={saving || username.length < 3} style={{
                width: '100%', padding: '16px', marginTop: 8,
                background: (saving || username.length < 3) ? 'rgba(232,197,71,0.4)' : 'var(--gold)',
                border: 'none', borderRadius: 12, color: '#000',
                fontWeight: 700, fontSize: 15, fontFamily: "'Inter', sans-serif",
                cursor: (saving || username.length < 3) ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              }}>
                {saving ? 'Guardando...' : 'Continuar →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  const completedCount = [
    avatarPreview || profile?.avatar_url,
    album1,
    album2,
    track,
  ].filter(Boolean).length
  const progressPct = Math.round((completedCount / 4) * 100)

  return (
    <div className="wax-edit-page">
      <div className="wax-edit-inner">
        {/* Header */}
        <Link href="/" className="wax-logo-link">
          <div className="wax-logo-mark">W</div>
          <span className="wax-logo-text">Wax</span>
        </Link>

        <div className="wax-eyebrow">Personaliza tu perfil</div>
        <h1 className="wax-h1">Cuéntanos tu <em>gusto.</em></h1>
        <p className="wax-lead">Elige los álbumes que definen quién eres y la canción que suena en tu perfil.</p>

        {/* Progreso — solo se muestra si el perfil aún no está completo */}
        {completedCount < 4 && (
          <div className="wax-progress-row">
            <span className="wax-progress-text">Tu perfil aún no está completo</span>
            <div className="wax-progress-track">
              <div className="wax-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="wax-progress-label">{completedCount}/4</span>
          </div>
        )}

        {/* Hero de identidad */}
        <div className="wax-identity-hero">
          <label className="wax-avatar-wrap">
            {(avatarPreview || profile?.avatar_url) ? (
              <img src={avatarPreview || profile.avatar_url} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="wax-avatar-initial">{(displayName || username || '?')[0]?.toUpperCase()}</span>
            )}
            <span className="wax-avatar-badge">{uploadingAvatar ? '···' : '✎'}</span>
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
          </label>

          <input
            type="text" value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            maxLength={40}
            placeholder="Tu nombre público"
            className="wax-name-input"
          />

          <div className="wax-username-row">
            <span>@</span>
            <input
              type="text" value={username}
              onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              minLength={3} maxLength={20}
              className="wax-username-input"
            />
          </div>
        </div>

        <div className="wax-divider" />

        {/* Álbumes */}
        <div className="wax-section-label">
          <span>Tus 2 álbumes favoritos</span>
          <span className="wax-section-hint">Los que más te han marcado en la vida</span>
        </div>
        <div className="wax-shelf-grid">
          <AlbumPicker label="Añadir álbum #1" value={album1} onChange={setAlbum1} />
          <AlbumPicker label="Añadir álbum #2" value={album2} onChange={setAlbum2} />
        </div>

        <div className="wax-divider" />

        {/* Canción */}
        <div className="wax-section-label">
          <span>Tu canción del momento</span>
          <span className="wax-section-hint">Aparece en tu perfil con un botón de reproducción ▶</span>
        </div>
        <TrackPicker value={track} onChange={setTrack} />

        {error && <div className="wax-error">{error}</div>}

        {/* Botones */}
        <div className="wax-save-bar">
          <button onClick={handleSave} disabled={saving} className="wax-btn-save">
            {saving ? 'Guardando...' : 'Guardar y entrar a Wax →'}
          </button>
          <button onClick={() => router.push(`/profile/${profile?.username || username}`)} className="wax-btn-skip">Luego</button>
        </div>

        <div className="wax-footnote">Puedes cambiar esto cuando quieras desde tu perfil</div>
      </div>

      <style jsx global>{`
        .wax-edit-page {
          min-height: 100vh;
          background: var(--bg);
          display: flex;
          justify-content: center;
          padding: 40px 24px 140px;
        }
        .wax-edit-inner {
          width: 100%;
          max-width: 600px;
        }
        .wax-logo-link {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 40px;
          text-decoration: none;
          width: fit-content;
        }
        .wax-logo-mark {
          width: 26px; height: 26px; border-radius: 50%;
          background: var(--gold);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Playfair Display', serif; font-weight: 700;
          font-size: 12px; color: #000;
        }
        .wax-logo-text {
          font-family: 'Playfair Display', serif;
          font-size: 17px; font-weight: 700; color: var(--text);
        }
        .wax-eyebrow {
          font-family: 'JetBrains Mono', monospace;
          font-size: 10px; color: var(--gold);
          letter-spacing: 0.14em; text-transform: uppercase;
          margin-bottom: 12px;
        }
        .wax-h1 {
          font-family: 'Playfair Display', serif;
          font-size: 40px; font-weight: 900; color: var(--text);
          line-height: 1.1; margin: 0 0 10px;
        }
        .wax-h1 em { font-style: italic; color: var(--gold); }
        .wax-lead {
          font-size: 15px; color: var(--muted); line-height: 1.6;
          margin: 0 0 28px; max-width: 460px;
        }

        /* progreso */
        .wax-progress-row {
          display: grid;
          grid-template-columns: 1fr auto;
          column-gap: 12px;
          row-gap: 8px;
          margin-bottom: 36px;
        }
        .wax-progress-text {
          font-size: 12.5px; color: var(--muted); grid-column: 1 / -1;
        }
        .wax-progress-track {
          height: 4px; border-radius: 2px;
          background: var(--border); overflow: hidden;
        }
        .wax-progress-fill {
          height: 100%; background: var(--gold);
          border-radius: 2px; transition: width 0.3s ease;
        }
        .wax-progress-label {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; color: var(--muted); flex-shrink: 0;
        }

        /* hero identidad */
        .wax-identity-hero {
          display: flex; flex-direction: column; align-items: center;
          text-align: center; gap: 6px; margin-bottom: 8px;
        }
        .wax-avatar-wrap {
          position: relative;
          width: 96px; height: 96px; border-radius: 50%;
          background: var(--surface); border: 2px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; cursor: pointer; margin-bottom: 16px;
          transition: border-color 0.2s;
        }
        .wax-avatar-wrap:hover { border-color: rgba(232,197,71,0.5); }
        .wax-avatar-wrap img { width: 100%; height: 100%; object-fit: cover; }
        .wax-avatar-initial {
          font-family: 'Playfair Display', serif; font-size: 32px; color: var(--gold);
        }
        .wax-avatar-badge {
          position: absolute; bottom: -2px; right: -2px;
          width: 28px; height: 28px; border-radius: 50%;
          background: var(--gold); color: #000;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; border: 3px solid var(--bg);
        }
        .wax-name-input {
          background: none; border: none; outline: none;
          text-align: center; color: var(--text);
          font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 700;
          width: 100%; max-width: 340px; padding: 4px 8px;
          border-bottom: 1px solid transparent;
          transition: border-color 0.2s;
        }
        .wax-name-input:focus { border-bottom-color: rgba(232,197,71,0.4); }
        .wax-name-input::placeholder { color: var(--muted); opacity: 0.6; }
        .wax-username-row {
          display: flex; align-items: center; gap: 2px;
          font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--muted);
        }
        .wax-username-input {
          background: none; border: none; outline: none;
          color: var(--muted); font-family: 'JetBrains Mono', monospace;
          font-size: 13px; text-align: center; padding: 2px 4px;
          border-bottom: 1px solid transparent; transition: border-color 0.2s;
        }
        .wax-username-input:focus { border-bottom-color: rgba(232,197,71,0.4); color: var(--text); }

        .wax-divider { height: 1px; background: var(--border); margin: 32px 0; }

        .wax-section-label {
          display: flex; flex-direction: column; gap: 3px; margin-bottom: 16px;
        }
        .wax-section-label > span:first-child {
          font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 700; color: var(--text);
        }
        .wax-section-hint { font-size: 12.5px; color: var(--muted); }

        /* estante de álbumes */
        .wax-shelf-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
        }
        .wax-shelf-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; min-height: 92px;
          display: flex; align-items: center;
        }
        .wax-shelf-filled { padding: 12px; gap: 12px; border-color: rgba(232,197,71,0.3); }
        .wax-shelf-cover { width: 56px; height: 56px; border-radius: 7px; object-fit: cover; flex-shrink: 0; }
        .wax-shelf-info { flex: 1; min-width: 0; }
        .wax-shelf-title {
          font-size: 13.5px; font-weight: 600; color: var(--text);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .wax-shelf-sub { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
        .wax-shelf-actions { display: flex; flex-direction: column; gap: 4px; flex-shrink: 0; }
        .wax-icon-btn {
          background: var(--bg); border: 1px solid var(--border); border-radius: 6px;
          width: 26px; height: 26px; color: var(--muted); cursor: pointer;
          font-size: 12px; display: flex; align-items: center; justify-content: center;
        }
        .wax-icon-btn:hover { color: var(--gold); border-color: rgba(232,197,71,0.4); }

        .wax-shelf-empty { padding: 0; border-style: dashed; }
        .wax-ghost-tile {
          width: 100%; height: 100%; min-height: 92px;
          background: none; border: none; cursor: pointer;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 8px; color: var(--muted); font-size: 12px;
          font-family: 'Inter', sans-serif; padding: 14px; text-align: center;
          transition: color 0.2s;
        }
        .wax-ghost-tile:hover { color: var(--gold); }
        .wax-ghost-tile-wide { flex-direction: row; min-height: 72px; }

        .wax-search-box { position: relative; padding: 4px; }
        .wax-search-input {
          width: 100%; padding: 13px 14px; box-sizing: border-box;
          background: var(--bg); border: 1px solid var(--border);
          border-radius: 10px; color: var(--text); font-size: 14px;
          font-family: 'Inter', sans-serif; outline: none;
        }
        .wax-search-results {
          position: absolute; top: 100%; left: 4px; right: 4px; z-index: 50;
          background: #181818; border: 1px solid var(--border);
          border-radius: 12px; margin-top: 4px; overflow: hidden;
          box-shadow: 0 16px 40px rgba(0,0,0,0.6);
        }
        .wax-search-loading { padding: 12px 16px; font-size: 12px; color: var(--muted); }
        .wax-search-result-row {
          display: flex; align-items: center; gap: 12px; padding: 10px 14px; cursor: pointer;
        }
        .wax-search-result-row:hover { background: #222; }
        .wax-search-result-row img { width: 40px; height: 40px; border-radius: 5px; object-fit: cover; flex-shrink: 0; }
        .wax-result-title {
          font-size: 13px; font-weight: 600; color: var(--text);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .wax-result-sub { font-size: 11px; color: var(--muted); }
        .wax-track-result { border-bottom: 1px solid var(--border); cursor: default; }
        .wax-track-result:last-child { border-bottom: none; }
        .wax-track-result-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .wax-mini-btn {
          background: var(--border); border: none; border-radius: 6px;
          padding: 5px 10px; color: var(--gold); cursor: pointer; font-size: 11px;
        }
        .wax-mini-btn-gold { background: var(--gold); color: #000; font-weight: 700; }

        /* track card lleno */
        .wax-track-card {
          display: flex; align-items: center; gap: 14px;
          background: var(--surface); border: 1px solid rgba(232,197,71,0.3);
          border-radius: 14px; padding: 14px;
        }
        .wax-track-cover { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
        .wax-track-info { flex: 1; min-width: 0; }
        .wax-play-link {
          margin-top: 6px; background: none; border: none; color: var(--gold);
          cursor: pointer; font-size: 11px; padding: 0; font-family: 'JetBrains Mono', monospace;
        }
        .wax-track-empty { min-height: 72px; }

        .wax-error {
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2);
          border-radius: 10px; padding: 12px 16px; font-size: 13px; color: #f87171;
          margin-top: 28px;
        }

        .wax-save-bar {
          display: flex; gap: 12px; margin-top: 32px;
        }
        .wax-btn-save {
          flex: 1; padding: 16px; background: var(--gold); border: none;
          border-radius: 12px; color: #000; font-weight: 700; font-size: 15px;
          font-family: 'Inter', sans-serif; cursor: pointer; transition: opacity 0.2s;
        }
        .wax-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
        .wax-btn-skip {
          padding: 16px 20px; background: none; border: 1px solid var(--border);
          border-radius: 12px; color: var(--muted); font-size: 14px;
          font-family: 'Inter', sans-serif; cursor: pointer;
        }
        .wax-footnote { font-size: 12px; color: var(--muted); text-align: center; margin-top: 16px; }

        /* ── MOBILE ── */
        @media (max-width: 640px) {
          .wax-edit-page { padding: 28px 16px 100px; }
          .wax-h1 { font-size: 30px; }
          .wax-shelf-grid { grid-template-columns: 1fr; gap: 10px; }
          .wax-shelf-filled { flex-direction: row; }
          .wax-avatar-wrap { width: 84px; height: 84px; }

          .wax-shelf-card { min-height: 68px; }
          .wax-shelf-filled { padding: 10px; gap: 10px; }
          .wax-shelf-cover { width: 44px; height: 44px; border-radius: 6px; }
          .wax-shelf-title { font-size: 13px; }
          .wax-shelf-sub { font-size: 11px; margin-top: 1px; }
          .wax-icon-btn { width: 24px; height: 24px; }

          .wax-track-card { padding: 10px; gap: 10px; }
          .wax-track-cover { width: 44px; height: 44px; border-radius: 6px; }

          .wax-ghost-tile { min-height: 68px; padding: 10px; gap: 6px; }
          .wax-ghost-tile-wide { min-height: 56px; flex-direction: row; }
          .wax-track-empty { min-height: 56px; }

          .wax-save-bar {
            position: fixed; left: 0; right: 0; bottom: 0;
            margin: 0; padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
            background: rgba(10,10,10,0.92); backdrop-filter: blur(10px);
            border-top: 1px solid var(--border); z-index: 40;
          }
          .wax-footnote { margin-bottom: 8px; }
          .wax-edit-inner { padding-bottom: 8px; }
        }
      `}</style>
    </div>
  )
}