// app/components/Navbar.jsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthProvider'

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

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', position: 'relative' }}>
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
            padding: 12px 16px !important;
          }
          .wax-navbar-logo-text {
            font-size: 16px !important;
          }
          .wax-navbar-links {
            gap: 14px !important;
          }
          .wax-navbar-links a {
            font-size: 12px !important;
          }
          .wax-navbar-username {
            display: none !important;
          }
          .wax-navbar-caret {
            margin-left: 0 !important;
          }
          .wax-navbar-user-btn {
            padding: 6px 8px !important;
          }
          .wax-navbar-login {
            display: none !important;
          }
        }

        @media (max-width: 480px) {
          .wax-navbar-links {
            gap: 10px !important;
          }
          .wax-navbar-links a {
            font-size: 11px !important;
          }
        }
      `}</style>
    </nav>
  )
}