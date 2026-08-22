import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin'
import { verifyUser } from '../../lib/verifyUser'

async function buildListSummary(list, userId) {
    const [{ data: items }, { count: likeCount }, likedByMe, { data: authorProfile }] = await Promise.all([
        supabase.from('list_items').select('album_cover_url').eq('list_id', list.id).order('position', { ascending: true }).limit(4),
        supabase.from('list_likes').select('*', { count: 'exact', head: true }).eq('list_id', list.id),
        userId
            ? supabase.from('list_likes').select('id').eq('list_id', list.id).eq('user_id', userId).maybeSingle().then(r => !!r.data)
            : Promise.resolve(false),
        supabase.from('profiles').select('username, display_name, avatar_url').eq('id', list.user_id).single(),
    ])

    return {
        ...list,
        covers: (items || []).map(i => i.album_cover_url).filter(Boolean),
        like_count: likeCount || 0,
        liked_by_me: likedByMe,
        author: authorProfile || null,
    }
}

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const userIdFilter = searchParams.get('userId')
    const viewerId = searchParams.get('viewerId')

    try {
        if (id) {
            const { data: list } = await supabase.from('lists').select('*').eq('id', id).single()
            if (!list) return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 })

            const [{ data: items }, { count: likeCount }, { data: authorProfile }] = await Promise.all([
                supabase.from('list_items').select('*').eq('list_id', id).order('position', { ascending: true }),
                supabase.from('list_likes').select('*', { count: 'exact', head: true }).eq('list_id', id),
                supabase.from('profiles').select('username, display_name, avatar_url').eq('id', list.user_id).single(),
            ])

            let likedByMe = false
            if (viewerId) {
                const { data } = await supabase.from('list_likes').select('id').eq('list_id', id).eq('user_id', viewerId).maybeSingle()
                likedByMe = !!data
            }

            return NextResponse.json({
                list: { ...list, author: authorProfile || null, like_count: likeCount || 0, liked_by_me: likedByMe },
                items: items || [],
            })
        }

        let query = supabase.from('lists').select('*').order('created_at', { ascending: false }).limit(30)
        if (userIdFilter) query = query.eq('user_id', userIdFilter)
        const { data: lists } = await query

        const summaries = await Promise.all((lists || []).map(l => buildListSummary(l, viewerId)))
        return NextResponse.json({ lists: summaries })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function POST(request) {
    const verifiedUser = await verifyUser(request)
    if (!verifiedUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    try {
        const payload = await request.json()
        const { title, description } = payload || {}

        if (!title?.trim()) {
            return NextResponse.json({ error: 'La lista necesita un título' }, { status: 400 })
        }
        if (title.trim().length > 100) {
            return NextResponse.json({ error: 'Título demasiado largo (máx. 100 caracteres)' }, { status: 400 })
        }
        if (description && description.trim().length > 300) {
            return NextResponse.json({ error: 'Descripción demasiado larga (máx. 300 caracteres)' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('lists')
            .insert({ user_id: verifiedUser.id, title: title.trim(), description: description?.trim() || null })
            .select('*')
            .single()

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ list: data })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function PATCH(request) {
    const verifiedUser = await verifyUser(request)
    if (!verifiedUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    try {
        const payload = await request.json()
        const { action, listId } = payload || {}
        if (!action || !listId) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

        const { data: list } = await supabase.from('lists').select('*').eq('id', listId).single()
        if (!list) return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 })

        if (action === 'addItem') {
            if (list.user_id !== verifiedUser.id) {
                return NextResponse.json({ error: 'No puedes editar la lista de otra persona' }, { status: 403 })
            }
            const { album } = payload
            if (!album?.id || !album?.name || !album?.artist) {
                return NextResponse.json({ error: 'Álbum inválido' }, { status: 400 })
            }

            const { count } = await supabase.from('list_items').select('*', { count: 'exact', head: true }).eq('list_id', listId)
            if ((count || 0) >= 100) {
                return NextResponse.json({ error: 'Una lista puede tener máximo 100 álbumes' }, { status: 400 })
            }

            const { error } = await supabase.from('list_items').insert({
                list_id: listId,
                album_id: String(album.id),
                album_title: album.name,
                album_artist: album.artist,
                album_cover_url: album.image || null,
                position: count || 0,
            })
            if (error) {
                if (error.code === '23505') return NextResponse.json({ error: 'Ese álbum ya está en la lista' }, { status: 400 })
                return NextResponse.json({ error: error.message }, { status: 500 })
            }
            await supabase.from('lists').update({ updated_at: new Date().toISOString() }).eq('id', listId)
            return NextResponse.json({ ok: true })
        }

        if (action === 'removeItem') {
            if (list.user_id !== verifiedUser.id) {
                return NextResponse.json({ error: 'No puedes editar la lista de otra persona' }, { status: 403 })
            }
            const { albumId } = payload
            const { error } = await supabase.from('list_items').delete().eq('list_id', listId).eq('album_id', String(albumId))
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
            return NextResponse.json({ ok: true })
        }

        if (action === 'like') {
            const { data: existing } = await supabase.from('list_likes').select('id').eq('list_id', listId).eq('user_id', verifiedUser.id).maybeSingle()
            if (existing) {
                await supabase.from('list_likes').delete().eq('id', existing.id)
            } else {
                await supabase.from('list_likes').insert({ list_id: listId, user_id: verifiedUser.id })
                if (list.user_id !== verifiedUser.id) {
                    await supabase.from('notifications').insert({
                        recipient_id: list.user_id,
                        actor_id: verifiedUser.id,
                        type: 'list_like',
                        post_id: String(listId),
                    })
                }
            }
            const { count } = await supabase.from('list_likes').select('*', { count: 'exact', head: true }).eq('list_id', listId)
            return NextResponse.json({ like_count: count || 0, liked_by_me: !existing })
        }

        if (action === 'editList') {
            if (list.user_id !== verifiedUser.id) {
                return NextResponse.json({ error: 'No puedes editar la lista de otra persona' }, { status: 403 })
            }
            const { title, description } = payload
            if (!title?.trim()) {
                return NextResponse.json({ error: 'La lista necesita un título' }, { status: 400 })
            }
            if (title.trim().length > 100) {
                return NextResponse.json({ error: 'Título demasiado largo (máx. 100 caracteres)' }, { status: 400 })
            }
            if (description && description.trim().length > 300) {
                return NextResponse.json({ error: 'Descripción demasiado larga (máx. 300 caracteres)' }, { status: 400 })
            }
            const { data: updated, error } = await supabase
                .from('lists')
                .update({ title: title.trim(), description: description?.trim() || null, updated_at: new Date().toISOString() })
                .eq('id', listId)
                .select('*')
                .single()
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
            return NextResponse.json({ list: updated })
        }

        if (action === 'toggleFeatured') {
            if (list.user_id !== verifiedUser.id) {
                return NextResponse.json({ error: 'No puedes modificar la lista de otra persona' }, { status: 403 })
            }
            const { data: updated, error } = await supabase
                .from('lists')
                .update({ featured: !list.featured, updated_at: new Date().toISOString() })
                .eq('id', listId)
                .select('featured')
                .single()
            if (error) return NextResponse.json({ error: error.message }, { status: 500 })
            return NextResponse.json({ featured: updated.featured })
        }

        return NextResponse.json({ error: 'Acción no reconocida' }, { status: 400 })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(request) {
    const verifiedUser = await verifyUser(request)
    if (!verifiedUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Falta el id' }, { status: 400 })

        const { data: list } = await supabase.from('lists').select('user_id').eq('id', id).single()
        if (!list) return NextResponse.json({ error: 'Lista no encontrada' }, { status: 404 })
        if (list.user_id !== verifiedUser.id) {
            return NextResponse.json({ error: 'No puedes borrar la lista de otra persona' }, { status: 403 })
        }

        const { error } = await supabase.from('lists').delete().eq('id', id)
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json({ ok: true })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}