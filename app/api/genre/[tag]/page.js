'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export default function GenrePage() {
  const { tag } = useParams()
  const router = useRouter()
  const [artists, setArtists] = useState([])
  const [loading, setLoading] = useState(true)

  const tagName = decodeURIComponent(tag || '')

  useEffect(() => {
    if (!tagName) return
    setLoading(true)
    fetch(`/api/genre?tag=${encodeURIComponent(tagName)}`)
      .then(r => r.json())
      .then(d => { setArtists(d.artists || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [tagName])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '0 0 60px' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '18px 48px', borderBottom: '1px solid var(--border)',
      }}>
        <button onClick={() => router.back()} style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '50%',
          width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'var(--text)', flexShrink: 0,
        }}>
          <ArrowLeft size={16} />
        </button>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 13, color: '#000' }}>W</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 700, color: 'var(--text)' }}>Wax</span>
        </Link>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 48px' }}>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
          Género
        </div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: 900, color: 'var(--text)', marginBottom: 32, textTransform: 'capitalize',
        }}>{tagName}</h1>

        {loading ? (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>Buscando artistas...</div>
        ) : artists.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>No encontramos artistas para esta etiqueta.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 24 }}>
            {artists.map(a => (
              <Link key={a.id} href={`/artist/${a.id}`} style={{ textDecoration: 'none', textAlign: 'center' }}>
                <div style={{
                  width: '100%', aspectRatio: '1', borderRadius: '50%', overflow: 'hidden',
                  background: '#1a1a1a', border: '1px solid var(--border)', marginBottom: 10,
                }}>
                  {a.image
                    ? <img src={a.image} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                    : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: 'var(--muted)' }}>♪</div>
                  }
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}