import { supabaseAdmin as supabase } from '../../lib/supabaseAdmin'
import { verifyUser } from '../../lib/verifyUser'

export async function GET(request) {
    const { searchParams } = new URL(request.url)
    const albumId = searchParams.get('albumId')
    const userId = searchParams.get('userId')

    try {
        if (albumId && userId) {
            // Calificaciones del usuario en un álbum específico
            const { data } = await supabase
                .from('song_reviews')
                .select('song_id, rating')
                .eq('album_id', albumId)
                .eq('user_id', userId)
            return Response.json(data || [])
        }

        if (userId) {
            // Todas las calificaciones de canciones de un usuario (para el perfil)
            const { data } = await supabase
                .from('song_reviews')
                .select('id, song_id, song_title, song_number, album_id, album_title, artist, cover_url, rating, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
            return Response.json(data || [])
        }

        return Response.json({ error: 'Falta albumId o userId' }, { status: 400 })
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 })
    }
}

export async function POST(request) {
    try {
        const verifiedUser = await verifyUser(request)
        if (!verifiedUser) return Response.json({ error: 'No autenticado' }, { status: 401 })

        const { songId, albumId, songTitle, songNumber, albumTitle, artist, coverUrl, rating } = await request.json()

        if (!songId || !albumId || !rating || rating < 1 || rating > 10) {
            return Response.json({ error: 'Datos inválidos' }, { status: 400 })
        }

        const { data, error } = await supabase
            .from('song_reviews')
            .upsert({
                user_id: verifiedUser.id,
                song_id: String(songId),
                album_id: String(albumId),
                song_title: songTitle,
                song_number: songNumber || null,
                album_title: albumTitle,
                artist,
                cover_url: coverUrl || null,
                rating,
            }, { onConflict: 'user_id,song_id' })
            .select('song_id, rating')
            .single()

        if (error) return Response.json({ error: error.message }, { status: 500 })
        return Response.json({ ok: true, review: data })
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 })
    }
}

export async function DELETE(request) {
    try {
        const verifiedUser = await verifyUser(request)
        if (!verifiedUser) return Response.json({ error: 'No autenticado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const songId = searchParams.get('songId')
        if (!songId) return Response.json({ error: 'Falta songId' }, { status: 400 })

        await supabase
            .from('song_reviews')
            .delete()
            .eq('user_id', verifiedUser.id)
            .eq('song_id', songId)

        return Response.json({ ok: true })
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 })
    }
}