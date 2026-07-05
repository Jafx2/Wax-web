// app/register/page.js
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import SocialAuthButtons from '../components/SocialAuthButtons'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState(1) // 1: email/pass, 2: username
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState(null)

  const handleStep1 = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setUserId(data.user?.id)
    setLoading(false)
    setStep(2)
  }

  const handleStep2 = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Verificar que el username no esté tomado
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .single()

    if (existing) {
      setError('Ese nombre de usuario ya está en uso')
      setLoading(false)
      return
    }

    // Upsert del perfil
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        username: username.toLowerCase(),
        display_name: displayName || username,
      })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    router.push('/setup')
  }

  const inputStyle = {
    width: '100%', padding: '14px 16px',
    background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 10, color: 'var(--text)',
    fontSize: 15, fontFamily: "'Inter', sans-serif", outline: 'none',
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, padding: '20px 48px' }}>
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
        {/* Steps indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 36 }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              width: s === step ? 24 : 8, height: 8, borderRadius: 4,
              background: s <= step ? 'var(--gold)' : 'var(--border)',
              transition: 'all 0.3s',
            }} />
          ))}
        </div>

        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
            {step === 1 ? 'Paso 1 de 2' : 'Paso 2 de 2'}
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 900, color: 'var(--text)', lineHeight: 1.1 }}>
            {step === 1
              ? <>Crea tu <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>cuenta</em></>
              : <>Tu <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>identidad</em></>
            }
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 10 }}>
            {step === 1 ? 'Gratis para siempre.' : 'Elige cómo te van a conocer.'}
          </p>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '36px 32px' }}>
          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 10, padding: '12px 16px', marginBottom: 24,
              fontSize: 13, color: '#f87171',
            }}>{error}</div>
          )}

          {step === 1 ? (
            <>
            <SocialAuthButtons />
            <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>EMAIL</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(232,197,71,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>CONTRASEÑA</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres" required minLength={6} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'rgba(232,197,71,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'} />
              </div>
              <button type="submit" disabled={loading} style={{
                width: '100%', padding: '16px', marginTop: 8,
                background: loading ? 'rgba(232,197,71,0.5)' : 'var(--gold)',
                border: 'none', borderRadius: 12, color: '#000',
                fontWeight: 700, fontSize: 15, fontFamily: "'Inter', sans-serif",
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              }}>
                {loading ? 'Creando cuenta...' : 'Continuar →'}
              </button>
            </form>
            </>
          ) : (
            <form onSubmit={handleStep2} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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
              <button type="submit" disabled={loading || username.length < 3} style={{
                width: '100%', padding: '16px', marginTop: 8,
                background: (loading || username.length < 3) ? 'rgba(232,197,71,0.4)' : 'var(--gold)',
                border: 'none', borderRadius: 12, color: '#000',
                fontWeight: 700, fontSize: 15, fontFamily: "'Inter', sans-serif",
                cursor: (loading || username.length < 3) ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
              }}>
                {loading ? 'Guardando...' : '¡Entrar a Wax!'}
              </button>
            </form>
          )}

          {step === 1 && (
            <div style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: 'var(--muted)' }}>
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" style={{ color: 'var(--gold)', fontWeight: 600 }}>Inicia sesión</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}