export async function POST(request) {
    const { token } = await request.json()

    if (!token) {
        return Response.json({ success: false, error: 'Falta el token' }, { status: 400 })
    }

    try {
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                secret: process.env.TURNSTILE_SECRET_KEY,
                response: token,
            }),
        })
        const data = await res.json()

        if (!data.success) {
            return Response.json({ success: false, error: 'Verificación fallida' }, { status: 400 })
        }

        return Response.json({ success: true })
    } catch (e) {
        return Response.json({ success: false, error: 'Error verificando' }, { status: 500 })
    }
}