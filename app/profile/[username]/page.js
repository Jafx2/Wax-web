'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../components/AuthProvider'
import Navbar from '../../components/Navbar'

// ── ACHIEVEMENTS ──────────────────────────────────────────
const ACHIEVEMENTS = [
  { type: 'first_review', label: 'Primera voz', desc: 'Escribiste tu primera reseña', tier: 'bronze', condition: (s) => s.reviews >= 1, shape: 'M12 2L9 9H2L7.5 13.5L5.5 21L12 17L18.5 21L16.5 13.5L22 9H15L12 2Z' },
  { type: 'reviews_10', label: 'Crítico en formación', desc: '10 reseñas escritas', tier: 'silver', condition: (s) => s.reviews >= 10, shape: 'M12 3L14.5 8.5L21 9.3L16.5 13.6L17.8 20L12 17L6.2 20L7.5 13.6L3 9.3L9.5 8.5L12 3Z' },
  { type: 'reviews_50', label: 'Crítico serio', desc: '50 reseñas escritas', tier: 'gold', condition: (s) => s.reviews >= 50, shape: 'M12 2L13.8 7.8H20L14.9 11.3L16.8 17L12 13.5L7.2 17L9.1 11.3L4 7.8H10.2L12 2Z' },
  { type: 'ratings_10', label: 'Explorador', desc: '10 álbumes calificados', tier: 'bronze', condition: (s) => s.ratings >= 10, shape: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3l2.5 5h5l-4 3.1 1.5 5L12 15l-5 3.1 1.5-5L4.5 10H10L12 5z' },
  { type: 'ratings_50', label: 'Oyente dedicado', desc: '50 álbumes calificados', tier: 'silver', condition: (s) => s.ratings >= 50, shape: 'M12 1L9.5 8.5H2L7.8 13L5.8 20.5L12 16.5L18.2 20.5L16.2 13L22 8.5H14.5L12 1Z' },
  { type: 'ratings_100', label: 'Oído de oro', desc: '100 álbumes calificados', tier: 'gold', condition: (s) => s.ratings >= 100, shape: 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z' },
  { type: 'followers_1', label: 'Primera conexión', desc: 'Alguien te empezó a seguir', tier: 'bronze', condition: (s) => s.followers >= 1, shape: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' },
  { type: 'followers_10', label: 'Influencer musical', desc: '10 seguidores', tier: 'gold', condition: (s) => s.followers >= 10, shape: 'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z' },
]

const TIER_COLORS = {
  bronze: { main: '#cd7f32', glow: 'rgba(205,127,50,0.4)', bg: 'rgba(205,127,50,0.08)', border: 'rgba(205,127,50,0.25)' },
  silver: { main: '#c0c0c0', glow: 'rgba(192,192,192,0.4)', bg: 'rgba(192,192,192,0.06)', border: 'rgba(192,192,192,0.2)' },
  gold:   { main: '#E8C547', glow: 'rgba(232,197,71,0.5)',  bg: 'rgba(232,197,71,0.1)',  border: 'rgba(232,197,71,0.35)' },
}

function AchievementBadge({ achievement, unlocked }) {
  const [hovered, setHovered] = useState(false)
  const tier = TIER_COLORS[achievement.tier]
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      position: 'relative', display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 16px', borderRadius: 14,
      background: unlocked ? tier.bg : 'rgba(255,255,255,0.02)',
      border: `1px solid ${unlocked ? tier.border : 'rgba(255,255,255,0.05)'}`,
      transition: 'all 0.25s', cursor: 'default',
      boxShadow: unlocked && hovered ? `0 0 20px ${tier.glow}` : 'none',
      transform: hovered && unlocked ? 'translateY(-1px)' : 'none',
    }}>
      <div style={{ position: 'relative', flexShrink: 0, width: 48, height: 48 }}>
        {unlocked && <div style={{ position: 'absolute', inset: -4, borderRadius: '50%', background: `radial-gradient(circle, ${tier.glow} 0%, transparent 70%)`, opacity: hovered ? 1 : 0.5, transition: 'opacity 0.3s' }} />}
        <svg width="48" height="48" viewBox="0 0 24 24" style={{ display: 'block', position: 'relative', zIndex: 1 }}>
          <circle cx="12" cy="12" r="11" fill={unlocked ? tier.bg : '#0f0f0f'} stroke={unlocked ? tier.border : '#1e1e1e'} strokeWidth="1" />
          <path d={achievement.shape} fill={unlocked ? tier.main : '#2a2a2a'} style={{ transition: 'fill 0.3s' }} />
          {unlocked && <ellipse cx="9" cy="8" rx="3" ry="1.5" fill="white" opacity="0.12" transform="rotate(-30 9 8)" />}
        </svg>
        {!unlocked && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', borderRadius: '50%' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2" fill="#333" />
              <path d="M8 11V7a4 4 0 018 0v4" stroke="#333" strokeWidth="2" fill="none" />
            </svg>
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: unlocked ? '#f0f0f0' : '#3a3a3a', lineHeight: 1.2, marginBottom: 4, transition: 'color 0.3s' }}>{achievement.label}</div>
        <div style={{ fontSize: 10, color: unlocked ? '#5a5a5a' : '#2a2a2a', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.4, transition: 'color 0.3s' }}>{achievement.desc}</div>
      </div>
      <div style={{ fontSize: 8, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.1em', textTransform: 'uppercase', color: unlocked ? tier.main : '#2a2a2a', flexShrink: 0, transition: 'color 0.3s' }}>{achievement.tier}</div>
    </div>
  )
}

// ── COMPATIBILIDAD ────────────────────────────────────────
function CompatibilityMeter({ percentage, label }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  const color = percentage >= 80 ? '#E8C547' : percentage >= 60 ? '#a0c878' : percentage >= 40 ? '#7ab3d4' : '#5a5a5a'
  const desc = percentage >= 85 ? 'Almas gemelas musicales' : percentage >= 70 ? 'Muy compatibles' : percentage >= 55 ? 'Bastante compatibles' : percentage >= 40 ? 'Algo en común' : percentage >= 20 ? 'Gustos distintos' : 'Mundos opuestos'

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1px solid ${percentage >= 70 ? 'rgba(232,197,71,0.2)' : 'var(--border)'}`,
      borderRadius: 16, padding: '20px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      position: 'relative', overflow: 'hidden',
    }}>
      {percentage >= 70 && (
        <div style={{ position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)', width: 140, height: 80, background: 'radial-gradient(ellipse, rgba(232,197,71,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      )}
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        Compatibilidad musical
      </div>
      <div style={{ position: 'relative', width: 96, height: 96 }}>
        <svg width="96" height="96" viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#1e1e1e" strokeWidth="6" />
          <circle cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1.2s ease, stroke 0.5s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{percentage}</div>
          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>%</div>
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, color: percentage >= 40 ? 'var(--text)' : 'var(--muted)', marginBottom: 4 }}>{desc}</div>
        {label && <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>{label}</div>}
      </div>
    </div>
  )
}

// ── TRACK PLAYER ──────────────────────────────────────────
function TrackPlayer({ track }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setProgress((audio.currentTime / (audio.duration || 30)) * 100)
    const onEnd = () => { setPlaying(false); setProgress(0) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnd)
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd) }
  }, [])
  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.src = track.preview; audio.play(); setPlaying(true) }
  }
  return (
    <div style={{ background: 'linear-gradient(135deg, #1a1508, #111)', border: '1px solid rgba(232,197,71,0.15)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <audio ref={audioRef} />
      <img src={track.image} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} referrerPolicy="no-referrer" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{track.artist}</div>
        <div style={{ marginTop: 8, height: 2, background: 'rgba(232,197,71,0.15)', borderRadius: 1 }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--gold)', borderRadius: 1, transition: 'width 0.1s linear' }} />
        </div>
      </div>
      <button onClick={toggle} style={{ width: 38, height: 38, borderRadius: '50%', background: playing ? 'rgba(232,197,71,0.15)' : 'var(--gold)', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: playing ? 16 : 14, color: playing ? 'var(--gold)' : '#000', transition: 'all 0.2s' }}>
        {playing ? '⏸' : '▶'}
      </button>
    </div>
  )
}

// ── ALBUM COVER ───────────────────────────────────────────
function AlbumCover({ albumId, number }) {
  const [album, setAlbum] = useState(null)
  useEffect(() => {
    if (!albumId) return
    supabase.from('albums').select('*').eq('album_id', albumId).single().then(({ data }) => {
      if (data) setAlbum({ name: data.title, artist: data.artist, image: data.cover_url, id: albumId })
      else fetch(`https://itunes.apple.com/lookup?id=${albumId}`).then(r => r.json()).then(d => {
        const a = d.results?.[0]
        if (a) setAlbum({ name: a.collectionName, artist: a.artistName, image: (a.artworkUrl100 || '').replace('100x100bb', '300x300bb'), id: albumId })
      })
    })
  }, [albumId])

  if (!albumId) return (
    <div style={{ aspectRatio: '1', borderRadius: 12, background: '#111', border: '1px dashed #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 24, color: '#2a2a2a' }}>♫</span>
      <span style={{ fontSize: 10, color: '#2a2a2a', fontFamily: "'JetBrains Mono', monospace" }}>#{number}</span>
    </div>
  )
  if (!album) return <div style={{ aspectRatio: '1', borderRadius: 12, background: '#1a1a1a' }} className="skeleton" />

  return (
    <Link href={`/album/${album.id}`}>
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1' }}>
        <img src={album.image} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} referrerPolicy="no-referrer" />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 55%)' }} />
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--gold)', background: 'rgba(0,0,0,0.6)', borderRadius: 4, padding: '2px 6px' }}>#{number}</span>
        </div>
        <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{album.artist}</div>
        </div>
      </div>
    </Link>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────
export default function ProfilePage() {
  const { username } = useParams()
  const { user, profile: myProfile } = useAuth()

  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('resenas')
  const [achievementStats, setAchievementStats] = useState({ reviews: 0, ratings: 0, followers: 0 })
  const [showAllAchievements, setShowAllAchievements] = useState(false)
  const [compatibility, setCompatibility] = useState(null)
  const [likedPosts, setLikedPosts] = useState([])
  const [respinnedPosts, setRespinnedPosts] = useState([])

  const isOwn = myProfile?.username === username

  useEffect(() => { if (!username) return; loadProfile() }, [username, user])

  async function calculateCompatibility(otherUserId) {
    const [{ data: myReviews }, { data: theirReviews }] = await Promise.all([
      supabase.from('reviews').select('album_id, rating').eq('user_id', user.id),
      supabase.from('reviews').select('album_id, rating').eq('user_id', otherUserId),
    ])

    if (!myReviews?.length || !theirReviews?.length) {
      setCompatibility({ score: 0, label: 'Sin reseñas suficientes para calcular' })
      return
    }

    const myMap = new Map(myReviews.map(r => [r.album_id, r.rating]))
    const theirMap = new Map(theirReviews.map(r => [r.album_id, r.rating]))
    const commonAlbums = [...myMap.keys()].filter(id => theirMap.has(id))

    if (commonAlbums.length === 0) {
      const myAvg = myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length
      const theirAvg = theirReviews.reduce((s, r) => s + r.rating, 0) / theirReviews.length
      const avgDiff = Math.abs(myAvg - theirAvg)
      const baseScore = Math.max(10, Math.round(35 - avgDiff * 5))
      setCompatibility({ score: baseScore, label: 'Sin álbumes en común aún' })
      return
    }

    let similaritySum = 0
    commonAlbums.forEach(id => {
      const diff = Math.abs(myMap.get(id) - theirMap.get(id))
      const sim = diff === 0 ? 100 : diff === 1 ? 85 : diff === 2 ? 65 : Math.max(0, 50 - diff * 10)
      similaritySum += sim
    })
    const avgSimilarity = similaritySum / commonAlbums.length
    const commonBonus = Math.min(15, commonAlbums.length * 3)
    const bothLoved = commonAlbums.filter(id => myMap.get(id) >= 7 && theirMap.get(id) >= 7).length
    const loveBonus = Math.min(10, bothLoved * 5)
    const finalScore = Math.min(99, Math.round(avgSimilarity * 0.75 + commonBonus + loveBonus))

    setCompatibility({
      score: finalScore,
      label: `${commonAlbums.length} álbum${commonAlbums.length !== 1 ? 'es' : ''} en común · ${bothLoved} que ambos amaron`,
    })
  }

  async function loadProfile() {
    const { data: prof } = await supabase.from('profiles').select('*').eq('username', username).single()
    if (!prof) { setLoading(false); return }
    setProfile(prof)

    const { data: revs } = await supabase.from('reviews').select('*, albums(title, artist, cover_url, album_id)').eq('user_id', prof.id).order('created_at', { ascending: false }).limit(20)
    setReviews(revs || [])

    // Posts que le dio like
const { data: likeRows } = await supabase
  .from('post_likes')
  .select('post_id')
  .eq('user_id', prof.id)

if (likeRows?.length) {
  const [{ data: likedTextPosts }, { data: likedReviews }] = await Promise.all([
    supabase.from('posts').select('*, profiles(username, display_name, avatar_url), albums(title, artist, cover_url)').in('id', likeRows.map(r => r.post_id)),
    supabase.from('reviews').select('*, profiles!reviews_user_id_fkey(username, display_name, avatar_url), albums!reviews_album_id_fkey(title, artist, cover_url)').in('id', likeRows.map(r => r.post_id)),
  ])
  setLikedPosts([...(likedTextPosts || []), ...(likedReviews || [])])
}

// Posts que hizo Re-spin
const { data: respinRows } = await supabase
  .from('respins')
  .select('post_id')
  .eq('user_id', prof.id)

if (respinRows?.length) {
  const [{ data: respinTextPosts }, { data: respinReviews }] = await Promise.all([
    supabase.from('posts').select('*, profiles(username, display_name, avatar_url), albums(title, artist, cover_url)').in('id', respinRows.map(r => r.post_id)),
    supabase.from('reviews').select('*, profiles!reviews_user_id_fkey(username, display_name, avatar_url), albums!reviews_album_id_fkey(title, artist, cover_url)').in('id', respinRows.map(r => r.post_id)),
  ])
  setRespinnedPosts([...(respinTextPosts || []), ...(respinReviews || [])])
}

    const [{ count: followers }, { count: following }, { count: ratingsCount }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', prof.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', prof.id),
      supabase.from('ratings').select('*', { count: 'exact', head: true }).eq('user_id', prof.id),
    ])
    setFollowerCount(followers || 0)
    setFollowingCount(following || 0)
    setAchievementStats({ reviews: revs?.length || 0, ratings: ratingsCount || 0, followers: followers || 0 })

    if (user && user.id !== prof.id) {
      const { data: followData } = await supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('following_id', prof.id).single()
      setIsFollowing(!!followData)
      calculateCompatibility(prof.id)
    }

    setLoading(false)
  }

  const handleFollow = async () => {
    if (!user) { window.location.href = '/login'; return }
    setFollowLoading(true)
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profile.id)
      setIsFollowing(false); setFollowerCount(c => c - 1)
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.id })
      setIsFollowing(true); setFollowerCount(c => c + 1)
    }
    setFollowLoading(false)
  }

  const unlockedAchievements = ACHIEVEMENTS.filter(a => a.condition(achievementStats))
  const lockedAchievements = ACHIEVEMENTS.filter(a => !a.condition(achievementStats))
  const displayedAchievements = showAllAchievements ? ACHIEVEMENTS : [...unlockedAchievements, ...lockedAchievements].slice(0, 4)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>Cargando perfil...</div>
    </div>
  )

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: 'var(--text)', marginBottom: 16 }}>Usuario no encontrado</div>
        <Link href="/" style={{ color: 'var(--gold)' }}>← Inicio</Link>
      </div>
    </div>
  )

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar activePage="/friends" />

      {/* BANNER */}
      <div style={{ paddingTop: 80, position: 'relative' }}>
        <div style={{ height: 160, position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1508 50%, #0f0a00 100%)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(232,197,71,0.08) 0%, transparent 60%)' }} />
          <div style={{ position: 'absolute', right: 80, top: '50%', transform: 'translateY(-50%)', width: 120, height: 120, borderRadius: '50%', background: 'repeating-radial-gradient(circle at 50% 50%, #1a1a1a 0px, #1a1a1a 2px, #222 2px, #222 4px)', opacity: 0.3 }} />
        </div>

        <div className="profile-banner-inner" style={{ maxWidth: 900, margin: '0 auto', padding: '0 48px', position: 'relative' }}>
          <div className="profile-avatar-wrap" style={{ position: 'absolute', top: -52, left: 48 }}>
            <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg, #2a1f08, #1a1a1a)', border: '4px solid var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: 38, fontWeight: 700, color: 'var(--gold)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
              {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : (profile.display_name || profile.username || '?')[0].toUpperCase()}
            </div>
          </div>

          <div className="profile-header-row" style={{ paddingTop: 56, paddingBottom: 28, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
            <div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{profile.display_name || profile.username}</h1>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>@{profile.username}</div>
              {profile.bio && <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10, maxWidth: 400, lineHeight: 1.6 }}>{profile.bio}</p>}
              <div className="profile-stats-row" style={{ display: 'flex', gap: 28, marginTop: 16 }}>
                {[{ n: followerCount, label: 'seguidores' },
                  { n: followingCount, label: 'siguiendo' },
                  ...(avgRating ? [{ n: avgRating, label: 'promedio', gold: true }] : []),
                ].map(({ n, label, gold }) => (
                  <div key={label}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 500, color: gold ? 'var(--gold)' : 'var(--text)' }}>{n}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 6 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              {isOwn ? (
                <Link href="/setup" style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 20px', display: 'inline-block' }}>Editar perfil</Link>
              ) : user ? (
                <button onClick={handleFollow} disabled={followLoading} style={{ fontSize: 13, fontWeight: 600, padding: '10px 24px', background: isFollowing ? 'transparent' : 'var(--gold)', color: isFollowing ? 'var(--text)' : '#000', border: isFollowing ? '1px solid var(--border)' : 'none', borderRadius: 10, cursor: 'pointer', transition: 'all 0.2s', fontFamily: "'Inter', sans-serif" }}>
                  {followLoading ? '...' : isFollowing ? 'Siguiendo' : '+ Seguir'}
                </button>
              ) : (
                <Link href="/login" className="btn-gold-sm">Seguir</Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CONTENIDO */}
      <div className="profile-content-wrap" style={{ maxWidth: 900, margin: '0 auto', padding: '40px 48px' }}>
        <div className="profile-content-grid" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 40, alignItems: 'start' }}>

          {/* SIDEBAR */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Compatibilidad — solo cuando ves el perfil de otro */}
            {!isOwn && user && compatibility !== null && (
              <CompatibilityMeter percentage={compatibility.score} label={compatibility.label} />
            )}

            {profile.favorite_track && (
              <div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
                  Cancion del momento
                </div>
                <TrackPlayer track={profile.favorite_track} />
              </div>
            )}

            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
                Albums favoritos
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <AlbumCover albumId={profile.favorite_album_id} number={1} />
                <AlbumCover albumId={profile.favorite_album_2_id} number={2} />
              </div>
              {isOwn && !profile.favorite_album_id && !profile.favorite_album_2_id && (
                <Link href="/setup" style={{ display: 'block', marginTop: 12, fontSize: 12, color: 'var(--gold)', textAlign: 'center', opacity: 0.8 }}>+ Añadir favoritos</Link>
              )}
            </div>

            {/* Logros */}
            <div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Logros</span>
                <span style={{ color: 'var(--muted)', fontSize: 9 }}>{unlockedAchievements.length}/{ACHIEVEMENTS.length}</span>
              </div>
              <div style={{ height: 2, background: 'var(--border)', borderRadius: 1, marginBottom: 12, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--gold)', borderRadius: 1, width: `${(unlockedAchievements.length / ACHIEVEMENTS.length) * 100}%`, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {displayedAchievements.map(a => <AchievementBadge key={a.type} achievement={a} unlocked={a.condition(achievementStats)} />)}
              </div>
              {ACHIEVEMENTS.length > 4 && (
                <button onClick={() => setShowAllAchievements(!showAllAchievements)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--gold)', marginTop: 10, fontFamily: "'JetBrains Mono', monospace", padding: 0, opacity: 0.8 }}>
                  {showAllAchievements ? 'Ver menos' : `Ver todos (${ACHIEVEMENTS.length})`}
                </button>
              )}
            </div>

            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: "'JetBrains Mono', monospace" }}>
              Miembro desde {new Date(profile.created_at).toLocaleDateString('es', { month: 'long', year: 'numeric' })}
            </div>
          </div>

          {/* RESEÑAS */}
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
              {[
                { id: 'resenas', label: `Reseñas (${reviews.length})`, count: reviews.length },
                { id: 'likes', label: 'Likes' },
                { id: 'respins', label: 'Re-spins' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '14px 18px', fontSize: 13, fontWeight: 700,
                  color: activeTab === tab.id ? 'var(--text)' : 'rgba(255,255,255,0.55)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--gold)' : '2px solid transparent',
                  marginBottom: -1, fontFamily: "'Inter', sans-serif", transition: 'color 0.2s, border-color 0.2s',
                }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'resenas' && (
              reviews.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>{isOwn ? 'Sin reseñas aún' : 'Sin reseñas todavía'}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>{isOwn ? 'Busca un álbum y comparte tu opinión' : 'Este usuario no ha reseñado álbumes aún'}</div>
                  {isOwn && <Link href="/albums" className="btn-gold-sm">Explorar álbumes</Link>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {reviews.map(review => (
                    <Link key={review.id} href={`/album/${review.album_id}`} style={{ display: 'block' }}>
                      <div className="review-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', cursor: 'pointer' }}>
                        <div style={{ display: 'flex', gap: 14 }}>
                          {review.albums?.cover_url && <img src={review.albums.cover_url} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} referrerPolicy="no-referrer" />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{review.albums?.title || 'Album'}</div>
                                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{review.albums?.artist}</div>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, color: 'var(--gold)', fontWeight: 600, lineHeight: 1 }}>{review.rating}</div>
                                <div style={{ fontSize: 9, color: 'var(--muted)', letterSpacing: '0.05em' }}>/10</div>
                              </div>
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, marginTop: 10 }}>{review.body}</p>
                            <div style={{ fontSize: 10, color: 'var(--muted-light)', marginTop: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                              {new Date(review.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            {isOwn && (
                              <button onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await supabase.from('reviews').delete().eq('id', review.id); setReviews(r => r.filter(r => r.id !== review.id)) }}
                                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12, marginTop: 8, fontFamily: "'JetBrains Mono', monospace", opacity: 0.6, padding: 0 }}>
                                Borrar resena
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            )}

            {activeTab === 'likes' && (
  likedPosts.length === 0 ? (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>Sin likes aún</div>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aquí aparecerán los posts que este usuario haya marcado con me gusta.</div>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {likedPosts.map(p => (
        <div key={p.id} className="review-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>@{p.profiles?.username}</div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>{p.body}</p>
        </div>
      ))}
    </div>
  )
)}

{activeTab === 'respins' && (
  respinnedPosts.length === 0 ? (
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>Sin Re-spins aún</div>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aquí aparecerán los elementos que este usuario haya compartido.</div>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {respinnedPosts.map(p => (
        <div key={p.id} className="review-card" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>@{p.profiles?.username}</div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>{p.body}</p>
        </div>
      ))}
    </div>
  )
)}

            {activeTab === 'respins' && (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>Re-spins</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Aquí aparecerán los elementos que este usuario haya compartido.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}