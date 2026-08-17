import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin'
import { verifyUser } from '../../lib/verifyUser'

export async function GET(request) {
    const verifiedUser = await verifyUser(request)
    if (!verifiedUser) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    const userId = verifiedUser.id // nunca confiamos en el userId de la URL

    const { data, error } = await supabase
        .from('notifications')
        .select('id, type, post_id, read, created_at, actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url)')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const unreadCount = (data || []).filter((n) => !n.read).length

    return NextResponse.json({ notifications: data || [], unreadCount })
}

export async function PATCH(request) {
    try {
        const verifiedUser = await verifyUser(request)
        if (!verifiedUser) {
            return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
        }
        const userId = verifiedUser.id

        const payload = await request.json()
        const { notificationId } = payload || {}

        let query = supabase.from('notifications').update({ read: true }).eq('recipient_id', userId)
        query = notificationId ? query.eq('id', notificationId) : query.eq('read', false)

        const { error } = await query
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json({ ok: true })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}