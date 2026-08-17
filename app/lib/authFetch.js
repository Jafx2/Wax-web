import { supabase } from './supabase'

// Igual que fetch(), pero agrega el token de sesión actual en el header
// Authorization. Úsalo para cualquier llamada a una ruta que requiera
// saber quién eres de verdad (dar like, comentar, publicar, etc.)
export async function authFetch(url, options = {}) {
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token

    const headers = {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }

    return fetch(url, { ...options, headers })
}