// app/reset-password/page.js
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [readyToReset, setReadyToReset] = useState(false)
    const [checkingLink, setCheckingLink] = useState(true)

    useEffect(() => {
        // Supabase procesa el enlace del correo y dispara este evento cuando
        // ya hay una sesión temporal válida de "recuperación de contraseña".
        // Sin este evento, no dejamos escribir la contraseña nueva — así nos
        // aseguramos de que solo alguien con acceso al correo real llegue aquí.
        const { data: listener } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setReadyToReset(true)
                setCheckingLink(false)
            }
        })

        // Si el enlace ya se procesó antes de que este componente montara,
        // igual puede haber sesión activa — lo confirmamos por si acaso.
        supabase.auth.getSession().then(({ data }) => {
            if (data?.session) {
                setReadyToReset(true)
            }
            setCheckingLink(false)
        })

        return () => listener?.subscription?.unsubscribe()
    }, [])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres')
            return
        }
        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden')
            return
        }

        setLoading(true)
        const { error } = await supabase.auth.updateUser({ password })

        if (error) {
            setError(error.message)
            setLoading(false)
            return
        }

        setSuccess(true)
        setLoading(false)
        setTimeout(() => router.push('/'), 2000)
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
                <div style={{ marginBottom: 40, textAlign: 'center' }}>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>
                        Nueva contraseña
                    </div>
                    <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 900, color: 'var(--text)', lineHeight: 1.1 }}>
                        Crea tu <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>nueva clave</em>
                    </h1>
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '36px 32px' }}>
                    {error && (
                        <div style={{
                            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: 10, padding: '12px 16px', marginBottom: 24,
                            fontSize: 13, color: '#f87171',
                        }}>{error}</div>
                    )}

                    {checkingLink ? (
                        <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--muted)' }}>
                            Verificando enlace...
                        </div>
                    ) : success ? (
                        <div style={{ textAlign: 'center', padding: '12px 0' }}>
                            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><CheckCircle2 size={40} color="var(--gold)" /></div>
                            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                                Contraseña actualizada
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--muted)' }}>Te estamos llevando al inicio...</p>
                        </div>
                    ) : readyToReset ? (
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                                    NUEVA CONTRASEÑA
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                    minLength={6}
                                    style={inputStyle}
                                    onFocus={e => e.target.style.borderColor = 'rgba(232,197,71,0.4)'}
                                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, letterSpacing: '0.05em', display: 'block', marginBottom: 8 }}>
                                    CONFIRMAR CONTRASEÑA
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                    placeholder="Repite la contraseña"
                                    required
                                    minLength={6}
                                    style={inputStyle}
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
                                {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
                            </button>
                        </form>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '12px 0' }}>
                            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><AlertTriangle size={40} color="#f87171" /></div>
                            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>
                                Enlace inválido o vencido
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
                                Pide un nuevo enlace de recuperación.
                            </p>
                            <Link href="/forgot-password" className="btn-gold-sm">Solicitar de nuevo</Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}