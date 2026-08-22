'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { List, Music2 } from 'lucide-react'
import { useAuth } from '../components/AuthProvider'
import { authFetch } from '../lib/authFetch'
import Navbar from '../components/Navbar'

function ListCard({ list }) {
    return (
        <Link href={`/lists/${list.id}`} style={{ textDecoration: 'none' }}>
            <div className="review-card" style={{
                background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
                padding: '18px 20px', cursor: 'pointer',
            }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                    {list.covers.length > 0 ? (
                        list.covers.slice(0, 4).map((cover, i) => (
                            <img key={i} src={cover} alt="" style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }} referrerPolicy="no-referrer" />
                        ))
                    ) : (
                        <div style={{ width: 44, height: 44, borderRadius: 6, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music2 size={18} color="var(--muted)" /></div>
                    )}
                </div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{list.title}</div>
                {list.description && (
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{list.description}</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--muted)' }}>
                    <span>@{list.author?.username || 'usuario'}</span>
                    <span>·</span>
                    <span>♥ {list.like_count}</span>
                </div>
            </div>
        </Link>
    )
}

function CreateListForm({ onCreated, onCancel }) {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!title.trim()) return
        setSubmitting(true)
        setError('')
        const res = await authFetch('/api/lists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: title.trim(), description: description.trim() }),
        })
        const data = await res.json()
        if (!res.ok) {
            setError(data.error || 'No se pudo crear la lista')
            setSubmitting(false)
            return
        }
        onCreated(data.list)
    }

    return (
        <form onSubmit={handleSubmit} style={{ background: 'var(--surface)', border: '1px solid rgba(232,197,71,0.25)', borderRadius: 16, padding: '22px 24px', marginBottom: 28, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && <div style={{ fontSize: 13, color: '#f87171' }}>{error}</div>}
            <input
                value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Título de la lista (ej. Discos para llorar en la ducha)"
                maxLength={100} required
                style={{ padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 15, fontFamily: "'Inter', sans-serif", outline: 'none' }}
            />
            <textarea
                value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Descripción (opcional)"
                maxLength={300} rows={2}
                style={{ padding: '12px 14px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 13, fontFamily: "'Inter', sans-serif", outline: 'none', resize: 'none' }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={!title.trim() || submitting} style={{
                    background: title.trim() ? 'var(--gold)' : 'rgba(232,197,71,0.3)', border: 'none', borderRadius: 100,
                    padding: '10px 22px', color: title.trim() ? '#000' : 'var(--muted)', fontWeight: 700, fontSize: 13,
                    cursor: title.trim() ? 'pointer' : 'not-allowed', fontFamily: "'Inter', sans-serif",
                }}>{submitting ? 'Creando...' : 'Crear lista'}</button>
                <button type="button" onClick={onCancel} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 100, padding: '10px 18px', color: 'var(--muted)', fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Cancelar</button>
            </div>
        </form>
    )
}

export default function ListsPage() {
    const { user, profile } = useAuth()
    const [lists, setLists] = useState([])
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState('global')
    const [creating, setCreating] = useState(false)

    useEffect(() => { loadLists() }, [tab, user])

    async function loadLists() {
        setLoading(true)
        const params = new URLSearchParams()
        if (tab === 'mias' && user) params.set('userId', user.id)
        if (user) params.set('viewerId', user.id)
        const res = await fetch(`/api/lists?${params.toString()}`)
        const data = await res.json()
        setLists(data.lists || [])
        setLoading(false)
    }

    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
            <Navbar activePage="/lists" />

            <div style={{ maxWidth: 900, margin: '0 auto', padding: '96px 24px 60px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
                    <div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Comunidad</div>
                        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 900, color: 'var(--text)' }}>Listas</h1>
                    </div>
                    {user && !creating && (
                        <button onClick={() => setCreating(true)} className="btn-gold-sm">+ Nueva lista</button>
                    )}
                </div>

                {creating && (
                    <CreateListForm
                        onCreated={(list) => { setCreating(false); setLists(prev => [{ ...list, covers: [], like_count: 0, liked_by_me: false, author: profile }, ...prev]) }}
                        onCancel={() => setCreating(false)}
                    />
                )}

                <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
                    {[{ id: 'global', label: 'Todas' }, ...(user ? [{ id: 'mias', label: 'Mis listas' }] : [])].map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)} style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: '12px 0', fontSize: 14, fontWeight: 600,
                            color: tab === t.id ? 'var(--text)' : 'var(--muted)',
                            borderBottom: tab === t.id ? '2px solid var(--gold)' : '2px solid transparent',
                            fontFamily: "'Inter', sans-serif", transition: 'color 0.2s',
                        }}>{t.label}</button>
                    ))}
                </div>

                {loading ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} style={{ height: 140, borderRadius: 16, background: '#111' }} className="skeleton" />
                        ))}
                    </div>
                ) : lists.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0' }}>
                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><List size={40} color="var(--muted)" /></div>
                        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: 'var(--text)', marginBottom: 8 }}>
                            {tab === 'mias' ? 'Aún no has creado listas' : 'Sin listas todavía'}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--muted)' }}>Arma una colección de álbumes con un tema</div>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                        {lists.map(list => <ListCard key={list.id} list={list} />)}
                    </div>
                )}
            </div>
        </div>
    )
}