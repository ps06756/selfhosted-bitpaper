# OpenBoard Setup Wizard

This is the automated onboarding app that helps teachers deploy their own OpenBoard instance.

## How It Works

1. Teacher visits this wizard
2. Connects their Vercel, Supabase, and Railway accounts via OAuth
3. Clicks "Deploy"
4. We automatically:
   - Create a Supabase project with database tables
   - Deploy the WebSocket server to Railway
   - Deploy the main app to Vercel
   - Configure all environment variables

## Setup (For Wizard Maintainers)

To run this wizard, you need to set up OAuth applications with each provider:

### 1. Vercel Integration

1. Go to [Vercel Integrations Console](https://vercel.com/dashboard/integrations/console)
2. Create a new integration
3. Set redirect URL to: `https://your-wizard-url.com/api/auth/vercel/callback`
4. Copy Client ID and Client Secret to `.env`

### 2. Supabase OAuth

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/account/tokens)
2. Create OAuth application
3. Set redirect URL to: `https://your-wizard-url.com/api/auth/supabase/callback`
4. Copy Client ID and Client Secret to `.env`

### 3. Railway OAuth

1. Go to [Railway Dashboard](https://railway.app/account/tokens)
2. Create OAuth application
3. Set redirect URL to: `https://your-wizard-url.com/api/auth/railway/callback`
4. Copy Client ID and Client Secret to `.env`

## Development

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Fill in your OAuth credentials

# Run development server
npm run dev

# Open http://localhost:3001
```

## Deployment

Deploy this wizard to Vercel:

```bash
cd setup-wizard
vercel
```

Then update your OAuth redirect URLs to point to the deployed URL.

## Architecture

```
setup-wizard/
├── src/
│   ├── app/
│   │   ├── page.tsx           # Landing page
│   │   ├── layout.tsx         # Root layout
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── vercel/    # Vercel OAuth callback
│   │       │   ├── supabase/  # Supabase OAuth callback
│   │       │   └── railway/   # Railway OAuth callback
│   │       └── deploy/        # Deployment orchestration
│   ├── components/
│   │   └── SetupWizard.tsx    # Main wizard UI
│   └── lib/                   # API helpers (future)
└── package.json
```
