import { supabaseAdmin } from './supabaseAdmin'

// Lee el header Authorization: Bearer <token> y le pregunta a Supabase
// quién es de verdad ese usuario. Si el token no existe, expiró, o fue
// falsificado, devuelve null — nunca confiamos en un userId que venga
// suelto en el body de la petición.
export async function verifyUser(request) {
    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) return null

    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data?.user) return null

    return data.user
}