'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Search } from 'lucide-react'

export default function GenrePage() {
  const { tag } = useParams()
  const router = useRouter()
  const tagName = decodeURIComponent(tag || '')

  const [activeTab, setActiveTab] = useState(1)
  const [pages, setPages] = useState({})     // { 1: [...artistas], 2: [...] }
  const [loading, setLoading] = useState({}) // { 1: true/false }
  const [hasMoreByTab, setHasMoreByTab] = useState({ 1: true })
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!tagName) return
    loadTab(1)
  }, [tagName])

  async function loadTab(tabNumber) {
    if (pages[tabNumber] || loading[tabNumber]) return
    setLoading(prev => ({ ...prev, [tabNumber]: true }))
    try {
      const res = await fetch(`/api/genre?tag=${encodeURIComponent(tagName)}&page=${tabNumber}`)
      const data = await res.json()
      setPages(prev => ({ ...prev, [tabNumber]: data.artists || [] }))
      setHasMoreByTab(prev => ({ ...prev, [tabNumber + 1]: data.hasMore }))
    } catch {
      setPages(prev => ({ ...prev, [tabNumber]: [] }))
    } finally {
      setLoading(prev => ({ ...prev, [tabNumber]: false }))
    }
  }

  function goToTab(tabNumber) {
    setActiveTab(tabNumber)
    setQuery('')
    loadTab(tabNumber)
  }

  const maxUnlockedTab = Object.keys(pages).length > 0
    ? Math.max(...Object.keys(pages).map(Number))
    : 1
  const visibleTabs = Array.from({ length: 5 }, (_, i) => i + 1)
    .filter(n => n <= maxUnlockedTab + (hasMoreByTab[maxUnlockedTab] || n === 1 ? 1 : 0))

  const currentArtists = pages[activeTab] || []
  const isLoadingCurrent = loading[activeTab]

  const filteredArtists = useMemo(() => {
    if (!query.trim()) return currentArtists
    const q = query.trim().toLowerCase()
    return currentArtists.filter(a => a.name.toLowerCase().includes(q))
  }, [currentArtists, query])

  return (
    <div className="genre-page">
      <nav className="genre-nav">
        <button onClick={() => router.back()} className="genre-back-btn">
          <ArrowLeft size={16} />
        </button>
        <Link href="/" className="genre-logo-link">
          <div className="genre-logo-mark">W</div>
          <span className="genre-logo-text">Wax</span>
        </Link>
      </nav>

      <div className="genre-content">
        <div className="genre-eyebrow">Género</div>
        <h1 className="genre-title">{tagName}</h1>

        <div className="genre-toolbar">
          {/* Pestañas de página */}
          {visibleTabs.length > 1 && (
            <div className="genre-tabs">
              {visibleTabs.map(n => (
                <button
                  key={n}
                  onClick={() => goToTab(n)}
                  className={`genre-tab-btn ${activeTab === n ? 'active' : ''}`}
                >
                  Página {n}
                </button>
              ))}
            </div>
          )}

          {/* Buscador local */}
          {currentArtists.length > 0 && (
            <div className="genre-search">
              <Search size={14} className="genre-search-icon" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar en esta página..."
                className="genre-search-input"
              />
            </div>
          )}
        </div>

        {isLoadingCurrent ? (
          <div className="genre-status">Buscando artistas...</div>
        ) : currentArtists.length === 0 ? (
          <div className="genre-status">No encontramos artistas para esta etiqueta.</div>
        ) : filteredArtists.length === 0 ? (
          <div className="genre-status">Ningún artista coincide con "{query}" en esta página.</div>
        ) : (
          <div className="genre-grid">
            {filteredArtists.map(a => (
              <Link key={a.id} href={`/artist/${a.id}`} className="genre-artist-card">
                <div className="genre-artist-photo">
                  {a.image
                    ? <img src={a.image} alt={a.name} referrerPolicy="no-referrer" />
                    : <div className="genre-artist-fallback">♪</div>
                  }
                </div>
                <div className="genre-artist-name">{a.name}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        .genre-page {
          background: var(--bg);
          min-height: 100vh;
          padding: 0 0 60px;
        }
        .genre-nav {
          display: flex; align-items: center; gap: 16px;
          padding: 18px 48px; border-bottom: 1px solid var(--border);
        }
        .genre-back-btn {
          background: var(--surface); border: 1px solid var(--border); border-radius: 50%;
          width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--text); flex-shrink: 0;
        }
        .genre-logo-link { display: flex; align-items: center; gap: 12px; text-decoration: none; }
        .genre-logo-mark {
          width: 28px; height: 28px; border-radius: 50%; background: var(--gold);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Playfair Display', serif; font-weight: 700; font-size: 13px; color: #000;
        }
        .genre-logo-text { font-family: 'Playfair Display', serif; font-size: 19px; font-weight: 700; color: var(--text); }

        .genre-content { max-width: 1100px; margin: 0 auto; padding: 40px 48px; }
        .genre-eyebrow {
          font-family: 'JetBrains Mono', monospace; font-size: 10px; color: var(--gold);
          letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 10px;
        }
        .genre-title {
          font-family: 'Playfair Display', serif; font-size: clamp(32px, 5vw, 48px);
          font-weight: 900; color: var(--text); margin: 0 0 28px; text-transform: capitalize;
        }

        .genre-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; flex-wrap: wrap; margin-bottom: 32px;
        }
        .genre-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
        .genre-tab-btn {
          padding: 8px 16px; border-radius: 100px; cursor: pointer;
          font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600;
          border: 1px solid var(--border); background: var(--surface); color: var(--muted);
          transition: all 0.15s;
        }
        .genre-tab-btn:hover { border-color: rgba(232,197,71,0.4); color: var(--text); }
        .genre-tab-btn.active {
          border: 1px solid var(--gold); background: rgba(232,197,71,0.1); color: var(--gold);
        }

        .genre-search {
          display: flex; align-items: center; gap: 8px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 100px; padding: 8px 14px; min-width: 220px;
        }
        .genre-search-icon { color: var(--muted); flex-shrink: 0; }
        .genre-search-input {
          background: none; border: none; outline: none; color: var(--text);
          font-size: 13px; font-family: 'Inter', sans-serif; width: 100%;
        }
        .genre-search-input::placeholder { color: var(--muted); }

        .genre-status {
          font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--muted);
        }

        .genre-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 24px;
        }
        .genre-artist-card { text-decoration: none; text-align: center; display: block; }
        .genre-artist-photo {
          width: 100%; aspect-ratio: 1; border-radius: 50%; overflow: hidden;
          background: #1a1a1a; border: 1px solid var(--border); margin-bottom: 10px;
          transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .genre-artist-photo img {
          width: 100%; height: 100%; object-fit: cover; display: block;
        }
        .genre-artist-fallback {
          width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
          font-size: 28px; color: var(--muted);
        }
        .genre-artist-card:hover .genre-artist-photo {
          transform: scale(1.05);
          border-color: rgba(232,197,71,0.6);
          box-shadow: 0 0 0 3px rgba(232,197,71,0.15), 0 8px 24px rgba(0,0,0,0.4);
        }
        .genre-artist-name {
          font-size: 13px; font-weight: 600; color: var(--text);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          transition: color 0.2s ease;
        }
        .genre-artist-card:hover .genre-artist-name { color: var(--gold); }

        /* ── MOBILE ── */
        @media (max-width: 640px) {
          .genre-nav { padding: 14px 16px; }
          .genre-content { padding: 28px 16px; }
          .genre-title { font-size: 30px; margin-bottom: 20px; }

          .genre-toolbar { flex-direction: column; align-items: stretch; gap: 12px; margin-bottom: 24px; }
          .genre-tabs { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 2px; }
          .genre-tab-btn { flex-shrink: 0; }
          .genre-search { width: 100%; min-width: 0; }

          .genre-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
          .genre-artist-name { font-size: 11.5px; }
        }
      `}</style>
    </div>
  )
}