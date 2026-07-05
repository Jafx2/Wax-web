(async ()=>{
  const LASTFM_KEY = 'd98e3e57fa365982f4f7e4f729edce51'
  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  const geminiKey = process.env.GEMINI_API_KEY

  console.log('SPOTIFY_CLIENT_ID set?', !!clientId)
  console.log('SPOTIFY_CLIENT_SECRET set?', !!clientSecret)

  try {
    const lfmRes = await fetch(`https://ws.audioscrobbler.com/2.0/?method=chart.getTopArtists&api_key=${LASTFM_KEY}&format=json&limit=12`)
    const lfmData = await lfmRes.json()
    const artistNames = (lfmData.artists?.artist || []).map(a => a.name).filter(Boolean).slice(0, 8)
    console.log('Last.fm artistNames:', artistNames)

    // If GEMINI key provided, ask Gemini to filter the list
    if (geminiKey) {
      try {
        const prompt = `Filter the following JSON array of names and return a JSON array (only) of up to 8 names that are musical recording artists (singers or bands). Keep the original order when possible. Respond with ONLY a JSON array, no extra text.\n\n${JSON.stringify(artistNames)}`
        const gRes = await fetch('https://generativelanguage.googleapis.com/v1alpha/models/gemini-2.5-flash:generateContent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${geminiKey}` },
          body: JSON.stringify({ prompt: { messages: [{ role: 'user', content: prompt }] }, temperature: 0.0, maxOutputTokens: 256 }),
        })
        const gTxt = await gRes.text()
        const match = gTxt.match(/\[[\s\S]*?\]/)
        let filtered = artistNames
        if (match) {
          try {
            const arr = JSON.parse(match[0])
            if (Array.isArray(arr)) filtered = arr.filter(x => typeof x === 'string').slice(0, 8)
          } catch (e) {}
        }
        console.log('Gemini filtered names:', filtered)
      } catch (err) {
        console.error('Gemini call failed:', err.message)
      }
    } else {
      console.log('GEMINI_API_KEY not provided; skipping Gemini filter')
    }

    if (!clientId || !clientSecret) {
      console.error('Missing Spotify credentials in env. Aborting token request.')
      process.exit(1)
    }

    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      },
      body: 'grant_type=client_credentials',
    })
    const tokenData = await tokenRes.json()
    if (!tokenData.access_token) {
      console.error('Could not get Spotify token:', tokenData)
      process.exit(1)
    }
    const token = tokenData.access_token

    for (const name of artistNames) {
      try {
        const spRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=5`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const spData = await spRes.json()
        const items = spData.artists?.items || []
        console.log('\n---', name)
        if (items.length === 0) {
          console.log('  no spotify results')
          continue
        }
        // Apply same matching rules as the API route
        const normalize = (s = '') => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
        const target = normalize(name)
        const stripThe = s => s.replace(/^the /, '')

        for (let i = 0; i < Math.min(5, items.length); i++) {
          const sp = items[i]
          try {
            const detRes = await fetch(`https://api.spotify.com/v1/artists/${sp.id}`, { headers: { Authorization: `Bearer ${token}` } })
            const det = await detRes.json()
            const spName = normalize(det.name || sp.name)
            const hasImage = (det.images || sp.images || []).length > 0
            const nameMatch = spName === target || stripThe(spName) === stripThe(target)
            console.log(`  [${i}] candidate=${det.name} | images=${(det.images||[]).length} | nameMatch=${nameMatch}`)
            if (hasImage && nameMatch) {
              console.log('    -> ACCEPTED for', name, '->', det.name)
              break
            }
          } catch (err) {
            console.log('  detail fetch failed for', sp.id, err.message)
          }
        }
      } catch (err) {
        console.error('  search error for', name, err.message)
      }
    }
  } catch (err) {
    console.error('debug script error:', err.message)
    process.exit(1)
  }
})()
