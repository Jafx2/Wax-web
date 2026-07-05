'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState('')

  useEffect(() => {
    async function handleCallback() {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const errorParam = params.get('error_description') || params.get('error')

      if (errorParam) {
        setError(errorParam)
        return
      }

      if (!code) {
        setError('No se recibió código de autenticación')
        return
      }

      const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      if (sessionError) {
        setError(sessionError.message)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile?.username) {
        router.replace('/setup')
      } else {
        router.replace('/')
      }
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <p style={{ color: '#f87171', fontSize: 14, textAlign: 'center', maxWidth: 400 }}>{error}</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>Iniciando sesión...</p>
    </div>
  )
}
