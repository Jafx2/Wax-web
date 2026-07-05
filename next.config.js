/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.scdn.co' },           // Spotify imágenes
      { protocol: 'https', hostname: 'mosaic.scdn.co' },      // Spotify mosaicos
      { protocol: 'https', hostname: '**.spotifycdn.com' },   // Spotify CDN
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
      { protocol: 'https', hostname: 'lastfm.freetls.fastly.net' },
    ],
  },
}

module.exports = nextConfig