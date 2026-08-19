// app/layout.js  — reemplaza el actual
import './globals.css'
import { AuthProvider } from './components/AuthProvider'

export const metadata = {
  metadataBase: new URL('https://wax-web.vercel.app'),
  title: {
    default: 'Wax — Tu diario musical',
    template: '%s',
  },
  description: 'Califica álbumes, escribe reseñas y descubre música con tus amigos.',
  verification: {
    google: 'kpxzB1enwU9Mi7KKrVCDBirJrN2Q1t9a6nShViqwKpc',
  },
  openGraph: {
    siteName: 'Wax',
    type: 'website',
    locale: 'es_ES',
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
        <meta name="google-site-verification" content="kpxzB1enwU9Mi7KKrVCDBirJrN2Q1t9a6nShViqwKpc" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,400&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning={true}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}