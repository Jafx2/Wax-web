import ProfileClient from './ProfileClient'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

export async function generateMetadata({ params }) {
  const { username } = await params
  try {
    const { data: prof } = await supabaseAdmin
      .from('profiles')
      .select('username, display_name, bio, avatar_url')
      .eq('username', username)
      .single()

    if (prof) {
      const name = prof.display_name || prof.username
      return {
        title: `@${prof.username} (${name}) — Perfil en Wax`,
        description: prof.bio || `Mira las reseñas, calificaciones y álbumes favoritos de @${prof.username} en Wax.`,
        openGraph: {
          title: `@${prof.username} (${name}) — Wax`,
          description: prof.bio || `Perfil musical de @${prof.username} en Wax.`,
          images: prof.avatar_url ? [{ url: prof.avatar_url }] : [],
        },
      }
    }
  } catch {}

  return {
    title: `@${username} — Perfil en Wax`,
    description: `Perfil y reseñas musicales de @${username} en Wax.`,
  }
}

export default async function Page({ params }) {
  const { username } = await params
  return <ProfileClient usernameParam={username} />
}