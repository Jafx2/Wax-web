'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
const [user, setUser] = useState(null)
const [profile, setProfile] = useState(null)
const [loading, setLoading] = useState(true)

useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
    setUser(session?.user ?? null)
    if (session?.user) fetchProfile(session.user.id)
    else setLoading(false)
    })

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null)
    if (session?.user) fetchProfile(session.user.id)
    else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
}, [])

async function fetchProfile(userId, retries = 3) {
const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle() // en vez de .single() — no lanza error si no hay fila

if (!data && retries > 0) {
    // El trigger puede tardar un momento en crear el perfil
    await new Promise(resolve => setTimeout(resolve, 500))
    return fetchProfile(userId, retries - 1)
}

setProfile(data)
setLoading(false)
}

return (
    <AuthContext.Provider value={{ user, profile, loading, setProfile }}>
    {children}
    </AuthContext.Provider>
)
}

export const useAuth = () => useContext(AuthContext)