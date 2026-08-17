import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin'

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
        return NextResponse.json({ notifications: [], unreadCount: 0 })
    }

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
        const payload = await request.json()
        const { userId, notificationId } = payload || {}

        if (!userId) {
            return NextResponse.json({ error: 'Falta userId' }, { status: 400 })
        }

        let query = supabase.from('notifications').update({ read: true }).eq('recipient_id', userId)
        query = notificationId ? query.eq('id', notificationId) : query.eq('read', false)

        const { error } = await query
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json({ ok: true })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}