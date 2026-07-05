(async ()=>{
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) return console.error('missing creds')
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
    },
    body: 'grant_type=client_credentials',
  })
  const tokenData = await tokenRes.json()
  const token = tokenData.access_token
  const name = 'Olivia Rodrigo'
  const spRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`, { headers: { Authorization: `Bearer ${token}` } })
  const spData = await spRes.json()
  console.log(JSON.stringify(spData, null, 2))
})()
