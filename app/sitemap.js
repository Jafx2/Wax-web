export default function sitemap() {
    const baseUrl = 'https://wax-web.vercel.app'

    const staticRoutes = [
        '',
        '/albums',
        '/feed',
        '/friends',
        '/quiz',
        '/login',
        '/register',
    ]

    return staticRoutes.map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: route === '' ? 1 : 0.7,
    }))
}