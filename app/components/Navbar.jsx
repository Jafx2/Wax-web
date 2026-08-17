// app/components/Navbar.jsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'

const NOTIF_TEXT = {
  like: 'le dio like a tu post',
  comment: 'comentó tu post',
  respin: 'le dio re-spin a tu post',
  follow: 'empezó a seguirte',
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function NotificationBell({ userId }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) return
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000) // refresca cada 30s
    return () => clearInterval(interval)
  }, [userId])

  useEffect(() => {
    if (!open) return
    function onClickOutside(e) {
      const button = document.getElementById('notif-bell-button')
      const dropdown = document.getElementById('notif-bell-dropdown')
      if (!button?.contains(e.target) && !dropdown?.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  async function loadNotifications() {
    try {
      const res = await fetch(`/api/notifications?userId=${userId}`)
      const data = await res.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch { }
  }

  async function handleOpen() {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen && unreadCount > 0) {
      setLoading(true)
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      setUnreadCount(0)
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setLoading(false)
    }
  }

  const notifLink = (n) => {
    if (n.type === 'follow') return n.actor?.username ? `/profile/${n.actor.username}` : '#'
    return n.post_id ? `/feed#post-${n.post_id}` : '/feed'
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        id="notif-bell-button"
        type="button"
        onClick={handleOpen}
        className="wax-navbar-bell"
        style={{
          position: 'relative', background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', color: 'var(--text)', flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8,
            background: '#e85d75', color: '#fff', fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
            border: '2px solid var(--bg)',
          }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div
          id="notif-bell-dropdown"
          style={{
            position: 'absolute', top: 'calc(100% + 10px)', right: 0,
            width: 320, maxHeight: 420, overflowY: 'auto',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 16, padding: 8, boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
            zIndex: 110,
          }}
        >
          <div style={{ padding: '8px 10px 10px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Notificaciones
          </div>
          {notifications.length === 0 ? (
            <div style={{ padding: '20px 10px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              Sin notificaciones todavía
            </div>
          ) : (
            notifications.map(n => (
              <Link
                key={n.id}
                href={notifLink(n)}
                onClick={() => setOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px',
                  borderRadius: 12, textDecoration: 'none',
                  background: n.read ? 'transparent' : 'rgba(232,197,71,0.06)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,197,71,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(232,197,71,0.06)'}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
                  background: 'var(--gold-dim)', border: '1px solid rgba(232,197,71,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Playfair Display', serif", fontSize: 13, fontWeight: 700, color: 'var(--gold)',
                }}>
                  {n.actor?.avatar_url
                    ? <img src={n.actor.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                    : (n.actor?.display_name || n.actor?.username || '?')[0]?.toUpperCase()
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.4 }}>
                    <strong>@{n.actor?.username || 'alguien'}</strong> {NOTIF_TEXT[n.type] || 'interactuó contigo'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
                {!n.read && (
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
                )}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function Navbar({ activePage }) {
  const router = useRouter()
  const { user, profile } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (event) => {
      const button = document.getElementById('profile-menu-button')
      const dropdown = document.getElementById('profile-menu-dropdown')
      if (!button?.contains(event.target) && !dropdown?.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handleSignOut = async () => {
    setMenuOpen(false)
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <nav className="wax-navbar" style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '18px 48px',
      background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(24px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <Link href="/" className="wax-navbar-logo" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: 'var(--gold)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 13, color: '#000',
          flexShrink: 0,
        }}>W</div>
        <span className="wax-navbar-logo-text" style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 700, color: 'var(--text)' }}>Wax</span>
      </Link>

      <div className="wax-navbar-links" style={{ display: 'flex', gap: 32 }}>
        {[
          { label: 'Artistas', href: '/albums' },
          { label: 'Feed', href: '/feed' },
          { label: 'Amigos', href: '/friends' },
          { label: 'Quiz', href: '/quiz' },
        ].map(({ label, href }) => (
          <Link key={href} href={href} className="nav-link" style={{
            color: activePage === href ? 'var(--text)' : undefined,
          }}>{label}</Link>
        ))}
      </div>

      <div className="wax-navbar-right" style={{ display: 'flex', gap: 12, alignItems: 'center', position: 'relative' }}>
        {user && profile && <NotificationBell userId={user.id} />}

        {user && profile ? (
          <button
            id="profile-menu-button"
            type="button"
            onClick={() => setMenuOpen(prev => !prev)}
            className="wax-navbar-user-btn"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 100, padding: '7px 14px 7px 8px',
              transition: 'border-color 0.2s, transform 0.2s',
              cursor: 'pointer', color: 'inherit', font: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(232,197,71,0.3)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: 'var(--gold-dim)', border: '1px solid rgba(232,197,71,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: "'Playfair Display', serif", fontSize: 12, fontWeight: 700, color: 'var(--gold)',
              overflow: 'hidden', flexShrink: 0,
            }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                : (profile.display_name || profile.username || '?')[0].toUpperCase()
              }
            </div>
            <span className="wax-navbar-username" style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>
              @{profile.username}
            </span>
            <span className="wax-navbar-caret" style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>▾</span>
          </button>
        ) : (
          <>
            <Link href="/login" className="nav-link wax-navbar-login" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>
              Iniciar sesión
            </Link>
            <Link href="/register" className="btn-gold-sm">Crear cuenta</Link>
          </>
        )}

        {user && profile && menuOpen && (
          <div
            id="profile-menu-dropdown"
            style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              minWidth: 180, background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, padding: 8, boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
              zIndex: 110,
            }}
          >
            <Link
              href={`/profile/${profile.username}`}
              onClick={() => setMenuOpen(false)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', background: 'transparent',
                color: 'var(--text)', fontSize: 13, fontWeight: 600, padding: '12px 14px',
                borderRadius: 12, transition: 'background 0.2s', textDecoration: 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,197,71,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Ver perfil
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                width: '100%', textAlign: 'left', background: 'transparent', border: 'none',
                color: 'var(--text)', fontSize: 13, fontWeight: 600, padding: '12px 14px',
                borderRadius: 12, cursor: 'pointer', transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(232,197,71,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Cerrar sesión
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .wax-navbar {
            padding: 12px 14px !important;
            gap: 8px !important;
          }
          .wax-navbar-logo-text {
            font-size: 15px !important;
          }
          .wax-navbar-links {
            gap: 10px !important;
          }
          .wax-navbar-links a {
            font-size: 11px !important;
          }
          .wax-navbar-right {
            gap: 6px !important;
          }
          .wax-navbar-bell {
            width: 30px !important;
            height: 30px !important;
          }
          .wax-navbar-username {
            display: none !important;
          }
          .wax-navbar-caret {
            display: none !important;
          }
          .wax-navbar-user-btn {
            padding: 4px !important;
            gap: 0 !important;
          }
          .wax-navbar-login {
            display: none !important;
          }
        }

        @media (max-width: 420px) {
          .wax-navbar-logo-text {
            display: none !important;
          }
          .wax-navbar-links {
            gap: 6px !important;
          }
          .wax-navbar-links a {
            font-size: 10px !important;
          }
        }
      `}</style>
    </nav>
  )
}