import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=No authorization code received from Supabase', request.url)
    )
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.supabase.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.SUPABASE_CLIENT_ID!,
        client_secret: process.env.SUPABASE_CLIENT_SECRET!,
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/supabase/callback`,
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Supabase token exchange failed:', error)
      return NextResponse.redirect(
        new URL('/?error=Failed to connect Supabase account', request.url)
      )
    }

    const tokenData = await tokenResponse.json()

    // Store token in secure cookie
    const cookieStore = await cookies()
    cookieStore.set('supabase_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    })

    if (tokenData.refresh_token) {
      cookieStore.set('supabase_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
    }

    return NextResponse.redirect(new URL('/?supabase=connected', request.url))
  } catch (error) {
    console.error('Supabase OAuth error:', error)
    return NextResponse.redirect(
      new URL('/?error=Failed to connect Supabase account', request.url)
    )
  }
}
