import ArtistClient from './ArtistClient'

export async function generateMetadata({ params }) {
  const { id } = await params
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

    if (clientId && clientSecret) {
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
        },
        body: 'grant_type=client_credentials',
        next: { revalidate: 3600 },
      })
      const tokenData = await tokenRes.json()
      if (tokenData.access_token) {
        const artistRes = await fetch(`https://api.spotify.com/v1/artists/${id}`, {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
          next: { revalidate: 86400 },
        })
        const artist = await artistRes.json()
        if (artist?.name) {
          const genres = (artist.genres || []).slice(0, 3).join(', ')
          return {
            title: `${artist.name} — Discografía y Reseñas en Wax`,
            description: genres
              ? `Explora la discografía, álbumes y canciones de ${artist.name} (${genres}) en Wax.`
              : `Explora la discografía, álbumes y canciones de ${artist.name} en Wax.`,
            openGraph: {
              title: `${artist.name} — Wax`,
              description: `Discografía y reseñas musicales de ${artist.name} en Wax.`,
              images: artist.images?.[0]?.url ? [{ url: artist.images[0].url }] : [],
            },
          }
        }
      }
    }
  } catch {}

  return {
    title: 'Artista — Wax',
    description: 'Explora artistas, discografías y reseñas musicales en Wax.',
  }
}

export default async function Page({ params }) {
  const { id } = await params
  return <ArtistClient artistId={id} />
}