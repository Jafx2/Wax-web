import { NextResponse } from 'next/server'
import { getArtistMusicbrainzInfo } from '../../../lib/musicbrainz'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')

  const result = await getArtistMusicbrainzInfo(name)
  return NextResponse.json({ result })
}