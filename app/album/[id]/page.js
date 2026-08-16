import AlbumClient from './AlbumClient'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

export async function generateMetadata({ params }) {
  const { id } = await params
  try {
    const { data: dbAlbum } = await supabaseAdmin
      .from('albums')
      .select('title, artist, cover_url, genre, release_year')
      .eq('album_id', String(id))
      .single()

    if (dbAlbum?.title) {
      return {
        title: `${dbAlbum.title} de ${dbAlbum.artist} — Reseñas en Wax`,
        description: `Lee y escribe reseñas sobre el álbum ${dbAlbum.title} de ${dbAlbum.artist} (${dbAlbum.release_year || 'Música'}) en Wax.`,
        openGraph: {
          title: `${dbAlbum.title} — ${dbAlbum.artist}`,
          description: `Reseñas y calificaciones del álbum ${dbAlbum.title} en Wax.`,
          images: dbAlbum.cover_url ? [{ url: dbAlbum.cover_url }] : [],
        },
      }
    }

    const itunesRes = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=album`, {
      next: { revalidate: 86400 },
    })
    const itunesData = await itunesRes.json()
    const item = itunesData.results?.[0]
    if (item) {
      const name = item.collectionName || item.trackName
      const artist = item.artistName
      const image = (item.artworkUrl100 || '').replace('100x100bb', '600x600bb')
      return {
        title: `${name} de ${artist} — Reseñas en Wax`,
        description: `Lee y escribe reseñas sobre el álbum ${name} de ${artist} en Wax.`,
        openGraph: {
          title: `${name} — ${artist}`,
          description: `Reseñas y calificaciones de ${name} en Wax.`,
          images: image ? [{ url: image }] : [],
        },
      }
    }
  } catch {}

  return {
    title: 'Álbum — Wax',
    description: 'Califica y reseña álbumes en Wax.',
  }
}

export default async function Page({ params }) {
  const { id } = await params
  return <AlbumClient albumId={id} />
}