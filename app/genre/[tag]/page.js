import GenreClient from './GenreClient'

export async function generateMetadata({ params }) {
  const { tag } = await params
  const decodedTag = decodeURIComponent(tag || '')
  const titleTag = decodedTag ? decodedTag.charAt(0).toUpperCase() + decodedTag.slice(1) : 'Género'

  return {
    title: `${titleTag} — Artistas y Música en Wax`,
    description: `Descubre artistas, álbumes y bandas destacadas del género ${decodedTag} en Wax.`,
    openGraph: {
      title: `${titleTag} en Wax`,
      description: `Explora lo mejor de la música ${decodedTag} en Wax.`,
      images: ['/og-default.png'],
    },
  }
}

export default async function Page({ params }) {
  const { tag } = await params
  return <GenreClient tagParam={tag} />
}