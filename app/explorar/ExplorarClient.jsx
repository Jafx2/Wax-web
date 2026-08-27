'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '../components/AuthProvider'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '../components/Navbar'

function Img({ src, alt, style }) {
    if (!src) return null
    return (
        <img src={src} alt={alt || ''} referrerPolicy="no-referrer"
            style={{ ...style, display: 'block' }}
            onError={(e) => { e.target.style.display = 'none' }}
        />
    )
}

function AlbumCard({ album }) {
    return (
        <Link href={`/album/${album.id}`} style={{ textDecoration: 'none' }}>
            <div style={{ flexShrink: 0, width: 150, cursor: 'pointer' }}>
                <div style={{ width: 150, height: 150, borderRadius: 10, overflow: 'hidden', background: '#1a1a1a', border: '1px solid var(--border)', marginBottom: 10, position: 'relative' }}>
                    {album.image
                        ? <Img src={album.image} alt={album.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: 'var(--muted)' }}>♫</div>
                    }
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{album.artist}</div>
            </div>
        </Link>
    )
}

function NeedMoreRatings({ count }) {
    const needed = 3 - count
    return (
        <section style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 48px' }}>
            <div style={{ textAlign: 'center', maxWidth: 520 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid rgba(232,197,71,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px' }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                        <path d="M9 18V5l12-2v13" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="6" cy="18" r="3" stroke="var(--gold)" strokeWidth="1.5" />
                        <circle cx="18" cy="16" r="3" stroke="var(--gold)" strokeWidth="1.5" />
                    </svg>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>Casi listo</div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(20px, 4vw, 42px)', fontWeight: 900, color: 'var(--text)', lineHeight: 1.1, marginBottom: 14 }}>
                    Cuéntanos tu <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>gusto musical</em>
                </h2>
                <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7, marginBottom: 12 }}>
                    Califica al menos <strong style={{ color: 'var(--text)' }}>3 álbumes con 7 o más</strong> para ver recomendaciones personalizadas.
                </p>
                {count > 0 && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(232,197,71,0.08)', border: '1px solid rgba(232,197,71,0.2)', borderRadius: 100, padding: '6px 16px', marginBottom: 28 }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--gold)' }}>{count}/3 — faltan {needed} más</span>
                    </div>
                )}
                {count === 0 && <div style={{ marginBottom: 28 }} />}
                <Link href="/albums" className="btn-gold-lg">Explorar álbumes</Link>
            </div>
        </section>
    )
}

export default function ExplorarClient() {
    const { user } = useAuth()
    const router = useRouter()
    const [recAlbums, setRecAlbums] = useState([])
    const [recArtists, setRecArtists] = useState([])
    const [recTracks, setRecTracks] = useState([])
    const [classicHeroAlbums, setClassicHeroAlbums] = useState([])
    const [reviewedHeroAlbums, setReviewedHeroAlbums] = useState([])
    const [goodRatingsCount, setGoodRatingsCount] = useState(0)
    const [loadingRecs, setLoadingRecs] = useState(true)
    const [country, setCountry] = useState('mx')
    const CACHE_TTL = 30 * 60 * 1000
    const cacheKey = user ? `wax_recs_${user.id}` : null

    useEffect(() => {
        if (!user) { router.push('/login'); return }
    }, [user])

    useEffect(() => {
        async function fetchClassicHeroAlbums() {
            const catalog = [
                { artist: 'Michael Jackson', title: 'Thriller' },
                { artist: 'Jeff Buckley', title: 'Grace' },
                { artist: 'Elvis Presley', title: 'ELV1S' },
                { artist: 'Arctic Monkeys', title: 'AM' },
                { artist: 'Radiohead', title: 'OK Computer' },
                { artist: 'Gustavo Cerati', title: 'Bocanada' },
            ]
            const items = await Promise.all(catalog.map(async ({ artist, title }) => {
                try {
                    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${title}`)}&entity=album&limit=1`)
                    const data = await res.json()
                    const album = data.results?.[0]
                    if (!album) return null
                    return { id: `${artist}-${title}`, name: title, artist, image: (album.artworkUrl100 || '').replace('100x100bb', '200x200bb') }
                } catch { return null }
            }))
            setClassicHeroAlbums(items.filter(Boolean))
        }
        fetchClassicHeroAlbums()
    }, [])

    useEffect(() => {
        if (!user) return
        loadRecommendations()
    }, [user, country])

    function shuffle(arr) {
        const a = [...arr]
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]]
        }
        return a
    }

    async function loadRecommendations() {
        setLoadingRecs(true)
        if (typeof window !== 'undefined' && cacheKey) {
            const cached = window.localStorage.getItem(cacheKey)
            if (cached) {
                try {
                    const { data, timestamp } = JSON.parse(cached)
                    if (Date.now() - timestamp < CACHE_TTL) {
                        setRecAlbums(data.albums)
                        setRecArtists(data.artists)
                        setRecTracks(data.tracks)
                        setGoodRatingsCount(data.count)
                        setReviewedHeroAlbums(data.reviewedAlbums || [])
                        setLoadingRecs(false)
                        return
                    }
                } catch { }
            }
        }

        const { data: goodReviews } = await supabase
            .from('reviews').select('album_id, rating, albums!reviews_album_id_fkey(title, artist, genre)')
            .eq('user_id', user.id).gte('rating', 7)

        const count = goodReviews?.length || 0
        setGoodRatingsCount(count)

        if (count < 3) { setRecAlbums([]); setRecArtists([]); setRecTracks([]); setLoadingRecs(false); return }

        const { data: allReviews } = await supabase
            .from('reviews').select('album_id, created_at, albums!reviews_album_id_fkey(title, artist, cover_url)')
            .eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)

        const ratedIds = new Set((allReviews || []).map(r => r.album_id))
        const heroReviewed = (allReviews || [])
            .map(r => ({ id: String(r.album_id), name: r.albums?.title || 'Álbum', artist: r.albums?.artist || 'Artista', image: r.albums?.cover_url || '' }))
            .filter(a => a.image)
        setReviewedHeroAlbums(heroReviewed)

        const genres = [...new Set((goodReviews || []).map(r => r.albums?.genre).filter(Boolean))]
        const favoriteArtists = [...new Set((goodReviews || []).map(r => r.albums?.artist).filter(Boolean))]
        const searchTerms = [...genres.slice(0, 2), ...favoriteArtists.slice(0, 2), 'indie', 'alternative']

        const albumResultsBatches = await Promise.all(
            searchTerms.slice(0, 4).map(async (term) => {
                try {
                    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=album&limit=8&country=${country}`)
                    const data = await res.json()
                    return (data.results || [])
                        .filter(a => !ratedIds.has(String(a.collectionId)))
                        .map(a => ({ id: String(a.collectionId), name: a.collectionName, artist: a.artistName, image: (a.artworkUrl100 || '').replace('100x100bb', '600x600bb'), genre: a.primaryGenreName || '', year: a.releaseDate?.slice(0, 4) || '' }))
                        .filter(a => a.image)
                } catch { return [] }
            })
        )
        const seen = new Set()
        const unique = albumResultsBatches.flat().filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true })
        const popular = unique.slice(0, Math.floor(unique.length * 0.7))
        const hidden = unique.slice(Math.floor(unique.length * 0.7))
        const finalAlbums = shuffle([...shuffle(popular).slice(0, 10), ...shuffle(hidden).slice(0, 5)]).slice(0, 12)
        setRecAlbums(finalAlbums)

        const likedArtists = [...new Set((goodReviews || []).sort((a, b) => b.rating - a.rating).map(r => r.albums?.artist).filter(Boolean))]
        const similarArtistsBatches = await Promise.all(
            likedArtists.slice(0, 3).map(async (artist) => {
                try {
                    const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=artist.getSimilar&artist=${encodeURIComponent(artist)}&api_key=d98e3e57fa365982f4f7e4f729edce51&format=json&limit=4`)
                    const data = await res.json()
                    return (data.similarartists?.artist || []).map(a => a.name)
                } catch { return [] }
            })
        )
        const knownArtists = new Set(likedArtists.map(a => a.toLowerCase()))
        const candidates = [...new Set(similarArtistsBatches.flat())].filter(name => !knownArtists.has(name.toLowerCase())).slice(0, 8)

        const enrichedArtists = await Promise.all(
            candidates.map(async (name) => {
                try {
                    const res = await fetch(`/api/artist?q=${encodeURIComponent(name)}`)
                    const data = await res.json()
                    const sp = data.artists?.[0]
                    if (sp?.image) return { id: sp.id, name: sp.name, image: sp.image }
                } catch { }
                return null
            })
        )
        setRecArtists(enrichedArtists.filter(Boolean).slice(0, 8))

        let tracks = []
        try {
            const res = await fetch(`https://itunes.apple.com/${country}/rss/topsongs/limit=10/json`)
            const data = await res.json()
            tracks = (data.feed?.entry || []).map(t => ({ name: t['im:name']?.label || '', artist: t['im:artist']?.label || '', image: t['im:image']?.[2]?.label?.replace('170x170', '600x600') || '', id: t['id']?.attributes?.['im:id'] || '' })).filter(t => t.image)
            setRecTracks(tracks)
        } catch { }

        if (typeof window !== 'undefined' && cacheKey) {
            window.localStorage.setItem(cacheKey, JSON.stringify({ data: { albums: finalAlbums, artists: enrichedArtists.filter(Boolean).slice(0, 8), tracks, count, reviewedAlbums: heroReviewed }, timestamp: Date.now() }))
        }
        setLoadingRecs(false)
    }

    const hasEnoughRatings = goodRatingsCount >= 3

    if (!user) return null

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh', overflowX: 'hidden' }}>
            <Navbar activePage="/explorar" />
            <div style={{ paddingTop: 64 }}>

                {!loadingRecs && !hasEnoughRatings && <NeedMoreRatings count={goodRatingsCount} />}

                {loadingRecs && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>Preparando tus recomendaciones...</div>
                    </div>
                )}

                {!loadingRecs && hasEnoughRatings && (
                    <>
                        <section style={{ padding: 'clamp(24px, 6vw, 48px) clamp(16px, 5vw, 48px) 0', maxWidth: 1200, margin: '0 auto' }}>
                            <div className="personalized-title" style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px, 6vw, 88px)', fontWeight: 900, color: 'var(--text)', lineHeight: 1.0, maxWidth: 760 }}>
                                Cada álbum cuenta <em style={{ color: '#E8C547', fontStyle: 'italic' }}>una historia.</em>
                            </div>
                            <div style={{ marginTop: 40, display: 'grid', gap: 28 }}>
                                <div className="hero-carousel" style={{ height: 280 }}>
                                    <div className="hero-carousel-track hero-carousel-track--right">
                                        {classicHeroAlbums.length > 0 ? [...classicHeroAlbums, ...classicHeroAlbums].map((album, index) => (
                                            <div key={`${album.id}-${index}`} className="hero-carousel-item">
                                                <Img src={album.image} alt={`${album.name} - ${album.artist}`} style={{ width: 200, height: 200, borderRadius: 12, objectFit: 'cover' }} />
                                                <div className="hero-carousel-item-label">
                                                    <div className="hero-carousel-item-title">{album.name}</div>
                                                    <div className="hero-carousel-item-subtitle">{album.artist}</div>
                                                </div>
                                            </div>
                                        )) : Array.from({ length: 6 }).map((_, i) => (
                                            <div key={`skel-${i}`} className="hero-carousel-item">
                                                <div className="skeleton" style={{ width: 200, height: 200, borderRadius: 12, background: '#111' }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="hero-carousel" style={{ height: 280 }}>
                                    <div className="hero-carousel-track hero-carousel-track--left">
                                        {loadingRecs ? Array.from({ length: 8 }).map((_, i) => (
                                            <div key={`skel2-${i}`} className="hero-carousel-item">
                                                <div className="skeleton" style={{ width: 200, height: 200, borderRadius: 12, background: '#111' }} />
                                            </div>
                                        )) : reviewedHeroAlbums.length > 0 ? [...reviewedHeroAlbums, ...reviewedHeroAlbums].map((album, index) => (
                                            <div key={`reviewed-${index}`} className="hero-carousel-item">
                                                <Img src={album.image} alt={`${album.name} - ${album.artist}`} style={{ width: 200, height: 200, borderRadius: 12, objectFit: 'cover' }} />
                                                <div className="hero-carousel-item-label">
                                                    <div className="hero-carousel-item-title">{album.name}</div>
                                                    <div className="hero-carousel-item-subtitle">{album.artist}</div>
                                                </div>
                                            </div>
                                        )) : null}
                                    </div>
                                </div>
                            </div>
                        </section>

                        {recAlbums.length > 0 && (
                            <section style={{ padding: 'clamp(24px, 6vw, 40px) 0', borderTop: '1px solid var(--border)', marginTop: 40 }}>
                                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 clamp(16px, 5vw, 48px)', marginBottom: 24 }}>
                                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Álbumes recomendados</div>
                                    <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>Te pueden gustar</h2>
                                </div>
                                <div style={{ paddingLeft: 'clamp(16px, 5vw, 48px)', overflowX: 'auto', paddingBottom: 4 }} className="scrollbar-hide">
                                    <div style={{ display: 'flex', gap: 16, width: 'max-content', paddingRight: 'clamp(16px, 5vw, 48px)' }}>
                                        {recAlbums.map((album, i) => <AlbumCard key={i} album={album} />)}
                                    </div>
                                </div>
                            </section>
                        )}

                        {recArtists.length > 0 && (
                            <section style={{ padding: 'clamp(24px, 6vw, 40px) clamp(16px, 5vw, 48px)', maxWidth: 1200, margin: '0 auto', borderTop: '1px solid var(--border)' }}>
                                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Artistas recomendados</div>
                                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: 'var(--text)', marginBottom: 24 }}>Quizás te interesen</h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                    {recArtists.map((artist, i) => (
                                        <div key={i} onClick={() => { fetch(`/api/artist?q=${encodeURIComponent(artist.name)}`).then(r => r.json()).then(data => { const id = data.artists?.[0]?.id; if (id) window.location.href = `/artist/${id}` }) }}
                                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                                            <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: '#1a1a1a', border: '2px solid var(--border)' }}>
                                                {artist.image ? <Img src={artist.image} alt={artist.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: 'var(--muted)' }}>♪</div>}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{artist.name}</div>
                                                {artist.genre && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{artist.genre}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {recTracks.length > 0 && (
                            <section style={{ padding: 'clamp(24px, 6vw, 40px) clamp(16px, 5vw, 48px)', maxWidth: 1200, margin: '0 auto', borderTop: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24, flexDirection: 'column', gap: 12 }}>
                                    <div>
                                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Canciones del momento</div>
                                        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>Top 10</h2>
                                    </div>
                                    <select value={country} onChange={e => { const val = e.target.value; if (typeof window !== 'undefined' && cacheKey) window.localStorage.removeItem(cacheKey); setCountry(val) }}
                                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', color: 'var(--muted)', fontSize: 12, fontFamily: "'JetBrains Mono', monospace", cursor: 'pointer', outline: 'none' }}>
                                        {[{ code: 'mx', label: 'México' }, { code: 'es', label: 'España' }, { code: 'ar', label: 'Argentina' }, { code: 'co', label: 'Colombia' }, { code: 'cl', label: 'Chile' }, { code: 've', label: 'Venezuela' }, { code: 'pe', label: 'Perú' }, { code: 'hn', label: 'Honduras' }].map(({ code, label }) => (
                                            <option key={code} value={code}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                    {recTracks.map((track, i) => (
                                        <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--muted)', width: 22, textAlign: 'center', flexShrink: 0 }}>{String(i + 1).padStart(2, '0')}</span>
                                            <div style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: '#1a1a1a' }}>
                                                <Img src={track.image} alt={track.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{track.artist}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}