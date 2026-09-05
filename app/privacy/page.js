import Link from 'next/link'
import Navbar from '../components/Navbar'

export const metadata = { title: 'Privacidad — Wax' }

export default function PrivacyPage() {
    return (
        <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
            <Navbar activePage="/" />
            <div style={{ maxWidth: 720, margin: '0 auto', padding: '120px 48px 80px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--gold)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Legal</div>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 900, color: 'var(--text)', marginBottom: 32 }}>Política de Privacidad</h1>
                <div style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <p>Wax es un proyecto personal en desarrollo. Recopilamos únicamente la información necesaria para que la plataforma funcione: tu dirección de correo electrónico y los datos que tú mismo publicas (reseñas, calificaciones, listas).</p>
                    <p>No vendemos ni compartimos tu información con terceros. Los datos se almacenan de forma segura en Supabase.</p>
                    <p>Puedes solicitar la eliminación de tu cuenta y todos tus datos en cualquier momento contactándonos.</p>
                    <p>Al usar Wax aceptas estos términos. Esta política puede actualizarse conforme el proyecto evolucione.</p>
                </div>
                <Link href="/" style={{ display: 'inline-block', marginTop: 40, color: 'var(--gold)', fontSize: 14 }}>← Volver al inicio</Link>
            </div>
        </div>
    )
}