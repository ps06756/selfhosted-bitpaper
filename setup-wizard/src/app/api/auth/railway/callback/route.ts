import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(
      new URL('/?error=No authorization code received from Railway', request.url)
    )
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation exchangeToken($code: String!, $redirectUri: String!) {
            oauthExchangeToken(input: { code: $code, redirectUri: $redirectUri }) {
              token
            }
          }
        `,
        variables: {
          code,
          redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/railway/callback`,
        },
      }),
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Railway token exchange failed:', error)
      return NextResponse.redirect(
        new URL('/?error=Failed to connect Railway account', request.url)
      )
    }

    const data = await tokenResponse.json()

    if (data.errors) {
      console.error('Railway GraphQL errors:', data.errors)
      return NextResponse.redirect(
        new URL('/?error=Failed to connect Railway account', request.url)
      )
    }

    const token = data.data?.oauthExchangeToken?.token

    if (!token) {
      return NextResponse.redirect(
        new URL('/?error=No token received from Railway', request.url)
      )
    }

    // Store token in secure cookie
    const cookieStore = await cookies()
    cookieStore.set('railway_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
    })

    return NextResponse.redirect(new URL('/?railway=connected', request.url))
  } catch (error) {
    console.error('Railway OAuth error:', error)
    return NextResponse.redirect(
      new URL('/?error=Failed to connect Railway account', request.url)
    )
  }
}
