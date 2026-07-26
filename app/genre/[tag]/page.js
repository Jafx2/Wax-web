'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Search } from 'lucide-react'

const MAX_PAGES = 10 // debe coincidir con MAX_PAGES en app/api/genre/route.js
const PREFETCH_DELAY_MS = 700 // pausa entre cada página al precargar de fondo

export default function GenrePage() {
  const { tag } = useParams()
  const router = useRouter()
  const tagName = decodeURIComponent(tag || '')

  const [activeTab, setActiveTab] = useState(1)
  const [pages, setPages] = useState({})       // { 1: [...artistas], 2: [...] }
  const [pageStatus, setPageStatus] = useState({}) // 'loading' | 'done' | 'empty'
  const [query, setQuery] = useState('')
  const prefetchStarted = useRef(false)

  useEffect(() => {
    if (!tagName || prefetchStarted.current) return
    prefetchStarted.current = true
    prefetchAll()
  }, [tagName])

  async function fetchPage(pageNumber) {
    setPageStatus(prev => ({ ...prev, [pageNumber]: 'loading' }))
    try {
      const res = await fetch(`/api/genre?tag=${encodeURIComponent(tagName)}&page=${pageNumber}`)
      const data = await res.json()
      const artists = data.artists || []
      setPages(prev => ({ ...prev, [pageNumber]: artists }))
      setPageStatus(prev => ({ ...prev, [pageNumber]: artists.length > 0 ? 'done' : 'empty' }))
      return { artists, hasMore: data.hasMore }
    } catch {
      setPages(prev => ({ ...prev, [pageNumber]: [] }))
      setPageStatus(prev => ({ ...prev, [pageNumber]: 'empty' }))
      return { artists: [], hasMore: false }
    }
  }

  // Trae la página 1 de inmediato, y el resto en segundo plano sin bloquear la vista
  async function prefetchAll() {
    const first = await fetchPage(1)
    if (first.artists.length === 0) return

    let keepGoing = first.hasMore
    for (let p = 2; p <= MAX_PAGES && keepGoing; p++) {
      await new Promise(r => setTimeout(r, PREFETCH_DELAY_MS))
      const result = await fetchPage(p)
      keepGoing = result.hasMore && result.artists.length > 0
    }
  }

  // Todas las pestañas que tienen (o podrían tener) artistas — se ocultan solo
  // una vez que confirmamos que esa página vino vacía (el género se acabó ahí)
  const visibleTabs = useMemo(() => {
    const tabs = []
    for (let n = 1; n <= MAX_PAGES; n++) {
      if (pageStatus[n] === 'empty') break
      tabs.push(n)
    }
    return tabs.length > 0 ? tabs : [1]
  }, [pageStatus])

  // Todo lo que se ha cargado hasta ahora, para la búsqueda global
  const allLoadedArtists = useMemo(() => {
    const seen = new Set()
    const combined = []
    for (let n = 1; n <= MAX_PAGES; n++) {
      for (const a of (pages[n] || [])) {
        if (seen.has(a.id)) continue
        seen.add(a.id)
        combined.push(a)
      }
    }
    return combined
  }, [pages])

  const isSearching = query.trim().length > 0
  const searchResults = useMemo(() => {
    if (!isSearching) return []
    const q = query.trim().toLowerCase()
    return allLoadedArtists.filter(a => a.name.toLowerCase().includes(q))
  }, [isSearching, query, allLoadedArtists])

  const stillLoadingSomewhere = Object.values(pageStatus).includes('loading') && visibleTabs.some(n => pageStatus[n] === 'loading' || pageStatus[n] === undefined) || (visibleTabs.length < MAX_PAGES && pageStatus[Math.max(...visibleTabs)] !== 'empty')

  const currentTabArtists = pages[activeTab] || []
  const currentTabLoading = pageStatus[activeTab] === 'loading' || pageStatus[activeTab] === undefined

  const displayedArtists = isSearching ? searchResults : currentTabArtists

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
          {!isSearching && visibleTabs.length > 1 && (
            <div className="genre-tabs">
              {visibleTabs.map(n => (
                <button
                  key={n}
                  onClick={() => setActiveTab(n)}
                  className={`genre-tab-btn ${activeTab === n ? 'active' : ''}`}
                >
                  Página {n}
                  {pageStatus[n] === 'loading' && <span className="genre-tab-dot" />}
                </button>
              ))}
            </div>
          )}

          <div className="genre-search">
            <Search size={14} className="genre-search-icon" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar artista o banda..."
              className="genre-search-input"
            />
          </div>
        </div>

        {isSearching && (
          <div className="genre-search-hint">
            {stillLoadingSomewhere
              ? 'Buscando entre los artistas cargados hasta ahora (seguimos trayendo más de fondo)...'
              : `${searchResults.length} resultado${searchResults.length === 1 ? '' : 's'} en todo lo cargado`}
          </div>
        )}

        {(isSearching ? false : currentTabLoading) ? (
          <div className="genre-status">Buscando artistas...</div>
        ) : displayedArtists.length === 0 ? (
          <div className="genre-status">
            {isSearching ? `Nadie llamado "${query}" en lo que hemos cargado todavía.` : 'No encontramos artistas para esta etiqueta.'}
          </div>
        ) : (
          <div className="genre-grid">
            {displayedArtists.map(a => (
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
          gap: 16px; flex-wrap: wrap; margin-bottom: 16px;
        }
        .genre-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
        .genre-tab-btn {
          position: relative;
          padding: 8px 16px; border-radius: 100px; cursor: pointer;
          font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 600;
          border: 1px solid var(--border); background: var(--surface); color: var(--muted);
          transition: all 0.15s;
        }
        .genre-tab-btn:hover { border-color: rgba(232,197,71,0.4); color: var(--text); }
        .genre-tab-btn.active {
          border: 1px solid var(--gold); background: rgba(232,197,71,0.1); color: var(--gold);
        }
        .genre-tab-dot {
          display: inline-block; width: 5px; height: 5px; border-radius: 50%;
          background: var(--gold); margin-left: 6px; opacity: 0.7;
        }

        .genre-search {
          display: flex; align-items: center; gap: 8px;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 100px; padding: 8px 14px; min-width: 240px;
        }
        .genre-search-icon { color: var(--muted); flex-shrink: 0; }
        .genre-search-input {
          background: none; border: none; outline: none; color: var(--text);
          font-size: 13px; font-family: 'Inter', sans-serif; width: 100%;
        }
        .genre-search-input::placeholder { color: var(--muted); }

        .genre-search-hint {
          font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--muted);
          margin-bottom: 20px;
        }

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

          .genre-toolbar { flex-direction: column; align-items: stretch; gap: 12px; margin-bottom: 12px; }
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