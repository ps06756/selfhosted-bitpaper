import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const configurationId = searchParams.get('configurationId')

  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=No authorization code received from Vercel', request.url)
    )
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.vercel.com/v2/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.VERCEL_CLIENT_ID!,
        client_secret: process.env.VERCEL_CLIENT_SECRET!,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/vercel/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Vercel token exchange failed:', error)
      return NextResponse.redirect(
        new URL('/?error=Failed to connect Vercel account', request.url)
      )
    }

    const tokenData = await tokenResponse.json()

    // Store token in secure cookie (in production, use a database)
    const cookieStore = await cookies()
    cookieStore.set('vercel_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    })

    if (tokenData.team_id) {
      cookieStore.set('vercel_team_id', tokenData.team_id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24,
      })
    }

    return NextResponse.redirect(new URL('/?vercel=connected', request.url))
  } catch (error) {
    console.error('Vercel OAuth error:', error)
    return NextResponse.redirect(
      new URL('/?error=Failed to connect Vercel account', request.url)
    )
  }
}
