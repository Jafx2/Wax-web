import { NextResponse } from 'next/server'

export async function GET(request) {
const { searchParams } = new URL(request.url)
const term = searchParams.get('term')

if (!term || !term.trim()) {
    return NextResponse.json({ results: [] })
}

try {
    const res = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=50&country=US`
    )
    const data = await res.json()

    const albums = (data.results || [])
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