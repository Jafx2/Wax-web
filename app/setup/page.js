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
      audio.play().catch(() => {})
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
        <div style={{ marginTop: 6, height: 2, background: 'var(--border)', borderRadius: 1 }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--gold)', borderRadius: 1, transition: 'width 0.1s linear' }} />
        </div>
      )}
    </>
  )
}

// ── ALBUM SEARCH ──────────────────────────────────────────
function AlbumPicker({ label, value, onChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)

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

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>

      {value ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--bg)', border: '1px solid rgba(232,197,71,0.3)', borderRadius: 12, padding: '12px 14px' }}>
          <img src={value.image} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} referrerPolicy="no-referrer" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{value.artist} · {value.year}</div>
          </div>
          <button onClick={() => onChange(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>×</button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar álbum..."
            style={{
              width: '100%', padding: '13px 16px',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 12, color: 'var(--text)',
              fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none',
            }}
          />
          {open && (results.length > 0 || searching) && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: '#181818', border: '1px solid var(--border)',
              borderRadius: 12, marginTop: 4, overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
            }}>
              {searching && <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>Buscando...</div>}
              {results.map(album => (
                <div
                  key={album.id}
                  onClick={() => { onChange(album); setOpen(false); setQuery('') }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#222'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <img src={album.image} alt="" style={{ width: 40, height: 40, borderRadius: 5, objectFit: 'cover' }} referrerPolicy="no-referrer" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{album.artist} · {album.year}</div>
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

// ── TRACK SEARCH ──────────────────────────────────────────
function TrackPicker({ value, onChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [open, setOpen] = useState(false)
  const [playingId, setPlayingId] = useState(null)

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

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Canción favorita</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12, opacity: 0.7 }}>La gente podrá reproducirla en tu perfil ▶</div>

      {value ? (
        <div style={{ background: 'var(--bg)', border: '1px solid rgba(232,197,71,0.3)', borderRadius: 12, padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <img src={value.image} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', display: 'block' }} referrerPolicy="no-referrer" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{value.artist}</div>
              <button
                onClick={() => setPlayingId(playingId === value.id ? null : value.id)}
                style={{ marginTop: 6, background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer', fontSize: 11, padding: 0, fontFamily: "'JetBrains Mono', monospace" }}
              >
                {playingId === value.id ? '⏸ Pausar' : '▶ Escuchar preview'}
              </button>
              <TrackPreview track={value} isPlaying={playingId === value.id} onToggle={setPlayingId} />
            </div>
            <button onClick={() => { onChange(null); setPlayingId(null) }} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}>×</button>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder="Buscar canción..."
            style={{
              width: '100%', padding: '13px 16px',
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 12, color: 'var(--text)',
              fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none',
            }}
          />
          {open && (results.length > 0 || searching) && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: '#181818', border: '1px solid var(--border)',
              borderRadius: 12, marginTop: 4, overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
            }}>
              {searching && <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>Buscando...</div>}
              {results.map(track => (
                <div key={track.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px' }}
                  >
                    <img src={track.image} alt="" style={{ width: 40, height: 40, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }} referrerPolicy="no-referrer" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{track.artist}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button
                        onClick={() => setPlayingId(playingId === track.id ? null : track.id)}
                        style={{ background: 'var(--border)', border: 'none', borderRadius: 6, padding: '5px 10px', color: 'var(--gold)', cursor: 'pointer', fontSize: 11 }}
                      >
                        {playingId === track.id ? '⏸' : '▶'}
                      </button>
                      <button
                        onClick={() => { onChange(track); setOpen(false); setQuery(''); setPlayingId(null) }}
                        style={{ background: 'var(--gold)', border: 'none', borderRadius: 6, padding: '5px 10px', color: '#000', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}
                      >
                        Elegir
                      </button>
                    </div>
                  </div>
                  {playingId === track.id && (
                    <div style={{ padding: '0 14px 10px' }}>
                      <TrackPreview track={track} isPlaying={true} onToggle={setPlayingId} />
                    </div>
                  )}
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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
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
      router.push('/')
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 24px 80px' }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: 560, marginBottom: 48 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 48 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 12, color: '#000' }}>W</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>Wax</span>
        </Link>

        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
          Personaliza tu perfil
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 900, color: 'var(--text)', lineHeight: 1.1, marginBottom: 10 }}>
          Cuéntanos tu <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>gusto.</em>
        </h1>
        <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6 }}>
          Elige los álbumes que definen quién eres y la canción que suena en tu perfil.
        </p>
      </div>

      {/* Form */}
      <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Identidad */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Tu identidad</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Cambia tu nombre de usuario o foto de perfil</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--bg)', border: '2px solid var(--border)' }}>
              {(avatarPreview || profile?.avatar_url) ? (
                <img src={avatarPreview || profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontSize: 22, fontFamily: "'Playfair Display', serif" }}>
                  {(displayName || username || '?')[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)', cursor: 'pointer', border: '1px solid rgba(232,197,71,0.3)', borderRadius: 10, padding: '9px 16px' }}>
              {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
              <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            </label>
          </div>

          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>NOMBRE DE USUARIO</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: 15 }}>@</span>
              <input
                type="text" value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                minLength={3} maxLength={20}
                style={{ ...inputStyle, paddingLeft: 32 }}
              />
            </div>
          </div>
        </div>

        {/* Álbumes */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Tus 2 álbumes favoritos</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Los que más te han marcado en la vida</div>
          </div>
          <AlbumPicker label="Álbum favorito #1" value={album1} onChange={setAlbum1} />
          <AlbumPicker label="Álbum favorito #2" value={album2} onChange={setAlbum2} />
        </div>

        {/* Canción */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '28px 28px' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Tu canción del momento</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aparece en tu perfil con un botón de reproducción</div>
          </div>
          <TrackPicker value={track} onChange={setTrack} />
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#f87171' }}>{error}</div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1, padding: '16px',
              background: saving ? 'rgba(232,197,71,0.5)' : 'var(--gold)',
              border: 'none', borderRadius: 12, color: '#000',
              fontWeight: 700, fontSize: 15, fontFamily: "'Inter', sans-serif",
              cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            }}
          >
            {saving ? 'Guardando...' : 'Guardar y entrar a Wax →'}
          </button>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '16px 20px',
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 12, color: 'var(--muted)',
              fontSize: 14, fontFamily: "'Inter', sans-serif", cursor: 'pointer',
            }}
          >
            Luego
          </button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Puedes cambiar esto cuando quieras desde tu perfil
        </div>
      </div>
    </div>
  )
}