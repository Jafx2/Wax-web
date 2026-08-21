'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '../../components/AuthProvider'
import { authFetch } from '../../lib/authFetch'
import Navbar from '../../components/Navbar'

function AlbumSearchBox({ onPick }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [searching, setSearching] = useState(false)

    useEffect(() => {
        if (!query.trim()) { setResults([]); return }
        const t = setTimeout(async () => {
            setSearching(true)
            const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=6`)
            const data = await res.json()
            setResults((data.results || []).map(a => ({
                id: String(a.collectionId), name: a.collectionName,
                artist: a.artistName, image: (a.artworkUrl100 || '').replace('100x100bb', '300x300bb'),
            })))
            setSearching(false)
        }, 350)
        return () => clearTimeout(t)
    }, [query])

    return (
        <div style={{ position: 'relative' }}>
            <input
                value={query} onChange={e => setQuery(e.target.value)}
                placeholder="🎵 Buscar álbum para agregar..."
                style={{ width: '100%', padding: '12px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)', fontSize: 14, fontFamily: "'Inter', sans-serif", outline: 'none' }}
            />
            {(results.length > 0 || searching) && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#181818', border: '1px solid var(--border)', borderRadius: 12, marginTop: 4, overflow: 'hidden', boxShadow: '0 16px 40px rgba(0,0,0,0.6)' }}>
                    {searching && <div style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>Buscando...</div>}
                    {results.map(album => (
                        <div key={album.id} onClick={() => { onPick(album); setQuery(''); setResults([]) }}
                            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#222'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <img src={album.image} alt="" style={{ width: 40, height: 40, borderRadius: 5, objectFit: 'cover' }} referrerPolicy="no-referrer" />
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{album.name}</div>
                                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{album.artist}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function ListDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const { user } = useAuth()
    const [list, setList] = useState(null)
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [liking, setLiking] = useState(false)

    const isOwn = user && list && user.id === list.user_id

    useEffect(() => { if (id) loadList() }, [id])

    async function loadList() {
        setLoading(true)
        const params = user ? `?id=${id}&viewerId=${user.id}` : `?id=${id}`
        const res = await fetch(`/api/lists${params}`)
        const data = await res.json()
        if (res.ok) {
            setList(data.list)
            setItems(data.items || [])
        }
        setLoading(false)
    }

    const handleAddAlbum = async (album) => {
        setError('')
        const res = await authFetch('/api/lists', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'addItem', listId: id, album }),
        })
        const data = await res.json()
        if (!res.ok) { setError(data.error || 'No se pudo agregar'); return }
        loadList()
    }

    const handleRemoveAlbum = async (albumId) => {
        await authFetch('/api/lists', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'removeItem', listId: id, albumId }),
        })
        setItems(prev => prev.filter(i => i.album_id !== albumId))
    }

    const handleLike = async () => {
        if (!user) { window.location.href = '/login'; return }
        setLiking(true)
        const res = await authFetch('/api/lists', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'like', listId: id }),
        })
        const data = await res.json()
        if (res.ok) setList(prev => ({ ...prev, like_count: data.like_count, liked_by_me: data.liked_by_me }))
        setLiking(false)
    }

    const handleDeleteList = async () => {
        if (!confirm('¿Borrar esta lista? No se puede deshacer.')) return
        const res = await authFetch(`/api/lists?id=${id}`, { method: 'DELETE' })
        if (res.ok) router.push('/lists')
    }

    if (loading) return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>Cargando lista...</div>
        </div>
    )

    if (!list) return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, color: 'var(--text)', marginBottom: 12 }}>Lista no encontrada</div>
                <Link href="/lists" style={{ color: 'var(--gold)' }}>← Volver a listas</Link>
            </div>
        </div>
    )

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
            <Navbar activePage="/lists" />

            <div style={{ maxWidth: 720, margin: '0 auto', padding: '96px 24px 60px' }}>
                <div style={{ marginBottom: 8 }}>
                    <Link href={`/profile/${list.author?.username}`} style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
                        @{list.author?.username || 'usuario'}
                    </Link>
                </div>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, color: 'var(--text)', marginBottom: 10 }}>{list.title}</h1>
                {list.description && <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20, maxWidth: 560 }}>{list.description}</p>}

                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
                    <button onClick={handleLike} disabled={liking} style={{
                        display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer',
                        color: list.liked_by_me ? '#e85d75' : 'var(--muted)', fontSize: 13, fontWeight: 600, padding: 0,
                    }}>
                        <span>{list.liked_by_me ? '♥' : '♡'}</span> {list.like_count}
                    </button>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{items.length} álbum{items.length !== 1 ? 'es' : ''}</span>
                    {isOwn && (
                        <button onClick={handleDeleteList} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', opacity: 0.6 }}>Borrar lista</button>
                    )}
                </div>

                {isOwn && (
                    <div style={{ marginBottom: 24 }}>
                        {error && <div style={{ fontSize: 12, color: '#f87171', marginBottom: 8 }}>{error}</div>}
                        <AlbumSearchBox onPick={handleAddAlbum} />
                    </div>
                )}

                {items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>
                        {isOwn ? 'Busca un álbum arriba para empezar tu lista' : 'Esta lista todavía no tiene álbumes'}
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {items.map((item, i) => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px' }}>
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)', width: 20, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
                                <Link href={`/album/${item.album_id}`} style={{ flexShrink: 0 }}>
                                    {item.album_cover_url
                                        ? <img src={item.album_cover_url} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover' }} referrerPolicy="no-referrer" />
                                        : <div style={{ width: 48, height: 48, borderRadius: 6, background: '#1a1a1a' }} />
                                    }
                                </Link>
                                <Link href={`/album/${item.album_id}`} style={{ flex: 1, minWidth: 0, textDecoration: 'none' }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.album_title}</div>
                                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{item.album_artist}</div>
                                </Link>
                                {isOwn && (
                                    <button onClick={() => handleRemoveAlbum(item.album_id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 18, opacity: 0.5, flexShrink: 0 }}>×</button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}