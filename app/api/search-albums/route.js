import { NextResponse } from 'next/server'

const COUNTRIES = ['US', 'MX', 'PR']

async function searchCountry(term, country) {
try {
const res = await fetch(
`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=50&country=${country}`
)
if (!res.ok) {
console.error(`iTunes fetch failed for ${country}:`, res.status)
return []
}
const data = await res.json()
return data.results || []
} catch (err) {
console.error(`iTunes fetch error for ${country}:`, err.message)
return []
}
}

export async function GET(request) {
const { searchParams } = new URL(request.url)
const term = searchParams.get('term')

if (!term || !term.trim()) {
    return NextResponse.json({ results: [] })
}

try {
    const resultsByCountry = await Promise.all(
    COUNTRIES.map(country => searchCountry(term, country))
    )

    const allResults = resultsByCountry.flat()

    // Quitar duplicados por collectionId (el mismo álbum puede salir en varios países)
    const seen = new Set()
    const deduped = allResults.filter(a => {
    if (!a.collectionId || seen.has(a.collectionId)) return false
    seen.add(a.collectionId)
    return true
    })

    const albums = deduped
    .filter(a => {
        const isSingle = a.trackCount <= 1 || /-\s*single$/i.test(a.collectionName || '')
        return !isSingle
    })
    .map(a => ({
        id: a.collectionId,
        name: a.collectionName,
        artist: a.artistName,
        image: (a.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
        year: a.releaseDate ? new Date(a.releaseDate).getFullYear() : '—',
        trackCount: a.trackCount || 0,
        genre: a.primaryGenreName || '',
    }))
    .slice(0, 20)

    return NextResponse.json({ results: albums })
} catch (err) {
    return NextResponse.json({ results: [], error: 'fetch_failed' }, { status: 500 })
}
}