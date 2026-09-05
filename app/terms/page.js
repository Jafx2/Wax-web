import Link from 'next/link'
import Navbar from '../components/Navbar'

export const metadata = { title: 'Términos — Wax' }

export default function TermsPage() {
    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
            <Navbar activePage="/" />
            <div style={{ maxWidth: 720, margin: '0 auto', padding: '120px 48px 80px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Legal</div>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 900, color: 'var(--text)', marginBottom: 32 }}>Términos de Uso</h1>
                <div style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <p>Wax es una plataforma para compartir reseñas y calificaciones musicales. Al crear una cuenta, aceptas usar el servicio de forma respetuosa.</p>
                    <p>Eres responsable del contenido que publicas. No está permitido publicar contenido ofensivo, spam ni información falsa.</p>
                    <p>Wax es un proyecto en desarrollo activo. Algunas funciones pueden cambiar o no estar disponibles en todo momento.</p>
                    <p>Nos reservamos el derecho de suspender cuentas que violen estas condiciones.</p>
                </div>
                <Link href="/" style={{ display: 'inline-block', marginTop: 40, color: 'var(--gold)', fontSize: 14 }}>← Volver al inicio</Link>
            </div>
        </div>
    )
}