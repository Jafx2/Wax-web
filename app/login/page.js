// app/login/page.js
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import SocialAuthButtons from '../components/SocialAuthButtons'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : error.message)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Logo arriba */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, padding: '20px 48px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: 'var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 13, color: '#000',
          }}>W</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 700, color: 'var(--text)' }}>Wax</span>
        </Link>
      </div>

      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Header */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
            Bienvenido de vuelta
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 900, color: 'var(--text)', lineHeight: 1.1 }}>
            Inicia <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>sesión</em>
          </h1>
        </div>

        {/* Form */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '36px 32px' }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 24,
              fontSize: 13, color: '#f87171',
            }}>{error}</div>
          )}

          <SocialAuthButtons />

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                style={{
                  width: '100%', padding: '14px 16px',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 10, color: 'var(--text)',
                  fontSize: 15, fontFamily: "'Inter', sans-serif", outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(232,197,71,0.4)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                CONTRASEÑA
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', padding: '14px 16px',
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 10, color: 'var(--text)',
                  fontSize: 15, fontFamily: "'Inter', sans-serif", outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = 'rgba(232,197,71,0.4)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '16px',
                background: loading ? 'rgba(232,197,71,0.5)' : 'var(--gold)',
                border: 'none', borderRadius: 12,
                color: '#000', fontWeight: 700, fontSize: 15,
                fontFamily: "'Inter', sans-serif", cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 8, transition: 'all 0.2s',
              }}
            >
              {loading ? 'Entrando...' : 'Iniciar sesión'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--muted)' }}>
            ¿No tienes cuenta?{' '}
            <Link href="/register" style={{ color: 'var(--gold)', fontWeight: 600 }}>Regístrate gratis</Link>
          </div>
        </div>
      </div>
    </div>
  )
}