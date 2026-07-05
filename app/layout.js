// app/layout.js  — reemplaza el actual
import './globals.css'
import { AuthProvider } from './components/AuthProvider'

export const metadata = {
  title: 'Wax — Tu diario musical',
  description: 'Califica álbumes, escribe reseñas y descubre música con tus amigos.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <head>
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