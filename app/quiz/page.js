'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { useAuth } from '../components/AuthProvider'

const TOTAL_QUESTIONS = 10
const ANSWER_TIME = 30
const POINTS_BASE = 100
const POINTS_FAST_5 = 50
const POINTS_FAST_10 = 25
const NONE_CORRECT_CHANCE = 0.28 // 28% de chance de que "Ninguna" sea correcta

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── WELCOME ───────────────────────────────────────────────
function WelcomeScreen({ albumCount, onStart, bestScore, bestStreak }) {
  const needed = Math.max(0, 4 - albumCount)
  const canPlay = albumCount >= 4

  return (
    <div style={{ maxWidth: 580, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%', margin: '0 auto 24px',
          background: 'linear-gradient(135deg, rgba(232,197,71,0.12), rgba(232,197,71,0.04))',
          border: '1px solid rgba(232,197,71,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <path d="M9 18V5l12-2v13" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="6" cy="18" r="3" stroke="var(--gold)" strokeWidth="1.5"/>
            <circle cx="18" cy="16" r="3" stroke="var(--gold)" strokeWidth="1.5"/>
          </svg>
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>
          Quiz Musical · Wax
        </div>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(34px, 5vw, 50px)', fontWeight: 900, color: 'var(--text)', lineHeight: 1.1, marginBottom: 14 }}>
          {canPlay
            ? <>¿Conoces tu <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>música?</em></>
            : <>Faltan <em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>{needed} álbumes</em></>
          }
        </h1>
        <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.7, maxWidth: 420, margin: '0 auto 32px' }}>
          {canPlay
            ? 'Escucha 30 segundos y adivina el nombre de la canción entre las opciones. Cuidado — a veces ninguna es correcta.'
            : `Califica al menos 4 álbumes con 6 o más para desbloquear el quiz. Tienes ${albumCount} ${albumCount === 1 ? 'álbum' : 'álbumes'} calificados.`
          }
        </p>
      </div>

      {canPlay ? (
        <>
          {(bestScore > 0 || bestStreak > 0) && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 32 }}>
              {bestScore > 0 && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 22px', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: 'var(--gold)' }}>{bestScore.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>mejor puntaje</div>
                </div>
              )}
              {bestStreak > 0 && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 22px', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{bestStreak}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>mejor racha</div>
                </div>
              )}
            </div>
          )}

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '18px 22px', marginBottom: 32, textAlign: 'left' }}>
            {[
              { label: `${TOTAL_QUESTIONS} preguntas por ronda` },
              { label: `${ANSWER_TIME} segundos por pregunta` },
              { label: 'Adivina el nombre de la cancion que suena' },
              { label: 'Cuidado — a veces ninguna opcion es correcta' },
              { label: 'Racha de 3 aciertos duplica los puntos' },
            ].map(({ label }, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0, opacity: 0.7 }} />
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>{label}</span>
              </div>
            ))}
          </div>

          <button onClick={onStart} style={{
            background: 'var(--gold)', border: 'none', borderRadius: 100,
            padding: '18px 52px', fontSize: 16, fontWeight: 700,
            color: '#000', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(232,197,71,0.35)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
          >
            Empezar ronda
          </button>
        </>
      ) : (
        <Link href="/albums" className="btn-gold-lg">Explorar albumes</Link>
      )}
    </div>
  )
}

// ── QUESTION ──────────────────────────────────────────────
function QuestionScreen({ question, questionNumber, score, streak, timeLeft, onAnswer, answered }) {
  const multiplier = streak >= 5 ? 3 : streak >= 3 ? 2 : 1
  const timerPct = (timeLeft / ANSWER_TIME) * 100
  const timerColor = timeLeft <= 5 ? '#f87171' : timeLeft <= 10 ? '#fbbf24' : 'var(--gold)'

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>
            {questionNumber}/{TOTAL_QUESTIONS}
          </div>
          {streak >= 3 && (
            <div style={{
              background: multiplier === 3 ? 'rgba(232,197,71,0.15)' : 'rgba(232,197,71,0.08)',
              border: `1px solid rgba(232,197,71,${multiplier === 3 ? '0.35' : '0.2'})`,
              borderRadius: 100, padding: '4px 12px',
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--gold)', fontWeight: 700,
            }}>
              x{multiplier} · racha {streak}
            </div>
          )}
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
          {score.toLocaleString()} pts
        </div>
      </div>

      {/* Timer */}
      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginBottom: 28, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 2, width: `${timerPct}%`, background: timerColor, transition: 'width 1s linear, background 0.3s' }} />
      </div>

      {/* Album info + player */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#1a1a1a' }}>
            {question.albumImage && <img src={question.albumImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" />}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
              Album
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{question.albumName}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{question.albumArtist}</div>
          </div>
        </div>

        {/* Waveform player */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 16,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: '14px 22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 28 }}>
            {[0.4,0.7,0.9,0.6,1,0.8,0.5,0.9,0.7,0.4,0.8,0.6].map((h, i) => (
              <div key={i} style={{
                width: 3, borderRadius: 2,
                background: answered ? 'var(--border)' : 'var(--gold)',
                height: `${h * 28}px`,
                animation: answered ? 'none' : `wave ${0.7 + i * 0.09}s ease-in-out infinite alternate`,
                animationDelay: `${i * 0.07}s`,
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>
            {answered ? 'preview terminado' : '— escuchando —'}
          </div>
          {!answered && (
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: timerColor, minWidth: 24, textAlign: 'center', transition: 'color 0.3s' }}>
              {timeLeft}
            </div>
          )}
        </div>

        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', marginTop: 12, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {answered ? (answered === '__none__' && !question.noneIsCorrect ? 'Habia una correcta...' : answered === '__none__' && question.noneIsCorrect ? 'Correcto — ninguna era la correcta' : `La cancion era: ${question.correctTrackName}`) : '¿Cual es el nombre de esta cancion?'}
        </div>
      </div>

      {/* Opciones */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {question.options.map((opt) => {
          const isNone = opt.id === '__none__'
          const isCorrect = isNone ? question.noneIsCorrect : opt.id === question.correctTrackId
          const isSelected = answered === opt.id

          let borderColor = 'var(--border)'
          let bg = 'var(--surface)'
          let opacity = 1

          if (answered) {
            if (isCorrect) { borderColor = 'rgba(74,222,128,0.5)'; bg = 'rgba(74,222,128,0.06)' }
            else if (isSelected && !isCorrect) { borderColor = 'rgba(248,113,113,0.5)'; bg = 'rgba(248,113,113,0.06)' }
            else { opacity = 0.35 }
          }

          return (
            <button
              key={opt.id}
              onClick={() => !answered && onAnswer(opt.id)}
              disabled={!!answered}
              style={{
                background: bg, border: `1px solid ${borderColor}`,
                borderRadius: 14, padding: isNone ? '18px 16px' : '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: answered ? 'default' : 'pointer',
                transition: 'all 0.18s', opacity,
                textAlign: 'left', width: '100%',
              }}
              onMouseEnter={e => { if (!answered) { e.currentTarget.style.borderColor = 'rgba(232,197,71,0.3)'; e.currentTarget.style.background = '#161616' } }}
              onMouseLeave={e => { if (!answered) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' } }}
            >
              {isNone ? (
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: answered && isCorrect ? '#4ade80' : answered && isSelected ? '#f87171' : 'var(--muted)', fontStyle: 'italic' }}>
                    Ninguna es correcta
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 600,
                      color: answered && isCorrect ? '#4ade80' : answered && isSelected && !isCorrect ? '#f87171' : 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      transition: 'color 0.2s',
                    }}>{opt.name}</div>
                  </div>
                  {answered && (isCorrect || (isSelected && !isCorrect)) && (
                    <div style={{ flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: isCorrect ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                        {isCorrect
                          ? <polyline points="20,6 9,17 4,12" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"/>
                          : <><line x1="18" y1="6" x2="6" y2="18" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="#f87171" strokeWidth="2.5" strokeLinecap="round"/></>
                        }
                      </svg>
                    </div>
                  )}
                </>
              )}
            </button>
          )
        })}
      </div>

      {/* Feedback puntos */}
      {answered && (
        <div style={{ textAlign: 'center', marginTop: 22 }}>
          {(() => {
            const isCorrect = answered === '__none__' ? question.noneIsCorrect : answered === question.correctTrackId
            if (isCorrect) return (
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: '#4ade80', fontWeight: 700 }}>
                +{question.pointsEarned?.toLocaleString() || 100} puntos
                {multiplier > 1 && <span style={{ fontSize: 13, color: 'var(--gold)', marginLeft: 8 }}>x{multiplier} racha</span>}
              </div>
            )
            return (
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, color: '#f87171' }}>
                {question.noneIsCorrect ? 'Era "Ninguna es correcta"' : `Era "${question.correctTrackName}"`}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

// ── RESULT ────────────────────────────────────────────────
function ResultScreen({ score, correct, total, bestStreak, onReplay, onHome, isNewBest }) {
  const pct = Math.round((correct / total) * 100)
  const grade = pct === 100 ? 'PERFECTO' : pct >= 80 ? 'EXCELENTE' : pct >= 60 ? 'BIEN' : pct >= 40 ? 'REGULAR' : 'SIGUE PRACTICANDO'
  const gradeColor = pct === 100 ? 'var(--gold)' : pct >= 80 ? '#a0c878' : pct >= 60 ? '#7ab3d4' : pct >= 40 ? '#fbbf24' : '#f87171'

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--muted)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>Resultado</div>
      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(38px, 8vw, 58px)', fontWeight: 900, color: gradeColor, lineHeight: 1, marginBottom: 10 }}>{grade}</div>
      {isNewBest && (
        <div style={{ display: 'inline-block', background: 'rgba(232,197,71,0.1)', border: '1px solid rgba(232,197,71,0.3)', borderRadius: 100, padding: '4px 14px', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: 28 }}>
          NUEVO RECORD PERSONAL
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, margin: '28px 0' }}>
        {[
          { n: score.toLocaleString(), label: 'puntos', color: 'var(--gold)' },
          { n: `${correct}/${total}`, label: 'correctas', color: 'var(--text)' },
          { n: bestStreak, label: 'mejor racha', color: 'var(--text)' },
        ].map(({ n, label, color }) => (
          <div key={label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 10px' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color }}>{n}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 32 }}>
        <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ width: `${pct}%`, height: '100%', background: gradeColor, borderRadius: 3, transition: 'width 1s ease' }} />
        </div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--muted)' }}>{pct}% precision</div>
      </div>

      {pct === 100 && (
        <div style={{ background: 'rgba(232,197,71,0.06)', border: '1px solid rgba(232,197,71,0.2)', borderRadius: 14, padding: '14px 20px', marginBottom: 24, textAlign: 'left' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: 'var(--gold)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Logro desbloqueado</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Ronda perfecta</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>10/10 respuestas correctas · gold</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button onClick={onReplay} style={{ background: 'var(--gold)', border: 'none', borderRadius: 100, padding: '14px 32px', fontSize: 15, fontWeight: 700, color: '#000', cursor: 'pointer', fontFamily: "'Inter', sans-serif", transition: 'all 0.2s' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(232,197,71,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
        >Otra ronda</button>
        <button onClick={onHome} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 100, padding: '14px 24px', fontSize: 14, color: 'var(--muted)', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Salir</button>
      </div>
    </div>
  )
}

// ── MAIN ──────────────────────────────────────────────────
export default function QuizPage() {
  const { user, profile } = useAuth()
  const [phase, setPhase] = useState('welcome')
  const [eligibleAlbums, setEligibleAlbums] = useState([])
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreakRound, setBestStreakRound] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [answered, setAnswered] = useState(null)
  const [timeLeft, setTimeLeft] = useState(ANSWER_TIME)
  const [bestScore, setBestScore] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [isNewBest, setIsNewBest] = useState(false)
  const [loading, setLoading] = useState(true)
  const audioRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => { if (user) loadData(); else setLoading(false) }, [user])

  async function loadData() {
    const { data: reviews } = await supabase
      .from('reviews')
      .select('album_id, rating, albums(title, artist, cover_url)')
      .eq('user_id', user.id)
      .gte('rating', 6)

    const savedBest = parseInt(localStorage.getItem(`wax_quiz_best_${user.id}`) || '0')
    const savedStreak = parseInt(localStorage.getItem(`wax_quiz_streak_${user.id}`) || '0')
    setBestScore(savedBest)
    setBestStreak(savedStreak)

    const albumsWithTracks = []
    for (const r of (reviews || [])) {
      if (!r.albums) continue
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(r.albums.title + ' ' + r.albums.artist)}&entity=song&limit=15`)
        const data = await res.json()
        const tracks = (data.results || []).filter(t =>
          t.previewUrl &&
          t.artistName?.toLowerCase() === r.albums.artist?.toLowerCase()
        )
        if (tracks.length >= 4) {
          albumsWithTracks.push({
            id: r.album_id,
            name: r.albums.title,
            artist: r.albums.artist,
            image: r.albums.cover_url,
            tracks: tracks.map(t => ({ id: String(t.trackId), name: t.trackName, preview: t.previewUrl })),
          })
        }
      } catch {}
    }
    setEligibleAlbums(albumsWithTracks)
    setLoading(false)
  }

  function buildQuestions(albums) {
    const qs = []
    const pool = shuffle(albums)
    const usedTrackIds = new Map()

    const normalize = (str) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()

    for (let i = 0; i < TOTAL_QUESTIONS; i++) {
      const album = pool[i % pool.length]

      if (!usedTrackIds.has(album.id)) usedTrackIds.set(album.id, new Set())
      const used = usedTrackIds.get(album.id)

      const available = shuffle(album.tracks.filter(t => !used.has(t.id)))
      const tracksPool = available.length >= 4 ? available : shuffle(album.tracks)

      const correctTrack = tracksPool[0]
      used.add(correctTrack.id)
      const correctNorm = normalize(correctTrack.name)

      const candidates = tracksPool.filter(t =>
        t.id !== correctTrack.id && normalize(t.name) !== correctNorm
      )

      const seenNames = new Set([correctNorm])
      const wrongTracks = []
      for (const t of candidates) {
        const norm = normalize(t.name)
        if (seenNames.has(norm)) continue
        seenNames.add(norm)
        wrongTracks.push({ id: t.id, name: t.name })
        if (wrongTracks.length === 3) break
      }

      if (wrongTracks.length < 3) {
        i--
        pool.push(pool.shift())
        continue
      }

      const noneIsCorrect = Math.random() < NONE_CORRECT_CHANCE

      let options
      if (noneIsCorrect) {
        options = shuffle([
          ...wrongTracks,
          { id: '__none__', name: 'Ninguna es correcta' },
        ])
      } else {
        options = shuffle([
          { id: correctTrack.id, name: correctTrack.name },
          ...wrongTracks.slice(0, 2),
          { id: '__none__', name: 'Ninguna es correcta' },
        ])
      }

      qs.push({
        albumName: album.name,
        albumArtist: album.artist,
        albumImage: album.image,
        correctTrackId: correctTrack.id,
        correctTrackName: correctTrack.name,
        previewUrl: correctTrack.preview,
        noneIsCorrect,
        options,
        pointsEarned: 0,
      })
    }
    return qs
  }

  function startGame() {
    const qs = buildQuestions(eligibleAlbums)
    setQuestions(qs)
    setCurrentQ(0)
    setScore(0)
    setStreak(0)
    setBestStreakRound(0)
    setCorrectCount(0)
    setAnswered(null)
    setTimeLeft(ANSWER_TIME)
    setIsNewBest(false)
    setPhase('playing')
  }

  useEffect(() => {
    if (phase !== 'playing' || !questions[currentQ]) return
    const audio = audioRef.current
    if (!audio) return
    audio.src = questions[currentQ].previewUrl
    audio.play().catch(() => {})
    setTimeLeft(ANSWER_TIME)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current); handleAnswer('__timeout__'); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [currentQ, phase])

  function handleAnswer(optionId) {
    if (answered !== null) return
    clearInterval(timerRef.current)

    const q = questions[currentQ]
    const isTimeout = optionId === '__timeout__'
    const isCorrect = !isTimeout && (
      optionId === '__none__' ? q.noneIsCorrect : optionId === q.correctTrackId
    )

    let pts = 0
    if (isCorrect) {
      const timeTaken = ANSWER_TIME - timeLeft
      const timeBonus = timeTaken <= 5 ? POINTS_FAST_5 : timeTaken <= 10 ? POINTS_FAST_10 : 0
      const newStreak = streak + 1
      const multiplier = newStreak >= 5 ? 3 : newStreak >= 3 ? 2 : 1
      pts = (POINTS_BASE + timeBonus) * multiplier
      setStreak(newStreak)
      setBestStreakRound(s => Math.max(s, newStreak))
      setCorrectCount(c => c + 1)
      setScore(s => s + pts)
    } else {
      setStreak(0)
    }

    questions[currentQ].pointsEarned = pts
    setAnswered(isTimeout ? '__timeout__' : optionId)

    setTimeout(() => {
      audioRef.current?.pause()
      if (currentQ + 1 >= questions.length) {
        finishGame()
      } else {
        setCurrentQ(q => q + 1)
        setAnswered(null)
      }
    }, 2000)
  }

  function finishGame() {
    const newBest = score > bestScore
    if (newBest) {
      setBestScore(score)
      localStorage.setItem(`wax_quiz_best_${user.id}`, String(score))
      setIsNewBest(true)
    }
    if (bestStreakRound > bestStreak) {
      setBestStreak(bestStreakRound)
      localStorage.setItem(`wax_quiz_streak_${user.id}`, String(bestStreakRound))
    }
    setPhase('result')
  }

  if (!user) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, color: 'var(--text)', marginBottom: 16 }}>Inicia sesion para jugar</div>
        <Link href="/login" className="btn-gold-lg">Iniciar sesion</Link>
      </div>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <style>{`@keyframes wave { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }`}</style>
      <audio ref={audioRef} />

      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 48px', background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 13, color: '#000' }}>W</div>
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 700, color: 'var(--text)' }}>Wax</span>
        </Link>
        <div style={{ display: 'flex', gap: 32 }}>
          {[{ label: 'Albums', href: '/albums' }, { label: 'Feed', href: '/feed' }, { label: 'Amigos', href: '/friends' }, { label: 'Quiz', href: '/quiz' }].map(({ label, href }) => (
            <Link key={href} href={href} className="nav-link" style={{ color: href === '/quiz' ? 'var(--text)' : undefined }}>{label}</Link>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          {user && profile ? (
            <Link href={`/profile/${profile.username}`} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 100, padding: '7px 14px 7px 8px' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--gold-dim)', border: '1px solid rgba(232,197,71,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: 12, fontWeight: 700, color: 'var(--gold)', overflow: 'hidden' }}>
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} referrerPolicy="no-referrer" /> : (profile.display_name || profile.username || '?')[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>@{profile.username}</span>
            </Link>
          ) : (
            <>
              <Link href="/login" className="nav-link" style={{ textTransform: 'none', letterSpacing: 0, fontSize: 13 }}>Iniciar sesion</Link>
              <Link href="/register" className="btn-gold-sm">Crear cuenta</Link>
            </>
          )}
        </div>
      </nav>

      <div style={{ paddingTop: 88, paddingBottom: 60 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--muted)' }}>Preparando quiz...</div>
          </div>
        ) : phase === 'welcome' ? (
          <WelcomeScreen albumCount={eligibleAlbums.length} onStart={startGame} bestScore={bestScore} bestStreak={bestStreak} />
        ) : phase === 'playing' && questions[currentQ] ? (
          <QuestionScreen
            question={questions[currentQ]}
            questionNumber={currentQ + 1}
            score={score}
            streak={streak}
            timeLeft={timeLeft}
            onAnswer={handleAnswer}
            answered={answered}
          />
        ) : phase === 'result' ? (
          <ResultScreen score={score} correct={correctCount} total={questions.length} bestStreak={bestStreakRound} onReplay={startGame} onHome={() => setPhase('welcome')} isNewBest={isNewBest} />
        ) : null}
      </div>
    </div>
  )
}