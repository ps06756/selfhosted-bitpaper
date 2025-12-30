import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const OPENBOARD_REPO = 'https://github.com/yourusername/openboard' // Update this

export async function POST(request: NextRequest) {
  try {
    const { projectName } = await request.json()

    if (!projectName || !/^[a-z0-9-]+$/.test(projectName)) {
      return NextResponse.json(
        { error: 'Invalid project name. Use only lowercase letters, numbers, and hyphens.' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const vercelToken = cookieStore.get('vercel_token')?.value
    const supabaseToken = cookieStore.get('supabase_token')?.value
    const vercelTeamId = cookieStore.get('vercel_team_id')?.value

    if (!vercelToken || !supabaseToken) {
      return NextResponse.json(
        { error: 'Missing required authentication tokens. Please reconnect your accounts.' },
        { status: 401 }
      )
    }

    // Step 1: Create Supabase project
    console.log('Creating Supabase project...')
    const supabaseProject = await createSupabaseProject(supabaseToken, projectName)

    // Step 2: Run database migrations
    console.log('Running database migrations...')
    await runSupabaseMigrations(supabaseProject)

    // Step 3: Deploy to Vercel with environment variables
    console.log('Deploying to Vercel...')
    const vercelDeployment = await deployToVercel(
      vercelToken,
      vercelTeamId,
      projectName,
      {
        NEXT_PUBLIC_SUPABASE_URL: supabaseProject.url,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseProject.anonKey,
        SUPABASE_SERVICE_ROLE_KEY: supabaseProject.serviceRoleKey,
      }
    )

    // Clear tokens from cookies
    cookieStore.delete('vercel_token')
    cookieStore.delete('supabase_token')
    cookieStore.delete('vercel_team_id')

    return NextResponse.json({
      success: true,
      url: vercelDeployment.url,
      supabaseUrl: supabaseProject.dashboardUrl,
    })
  } catch (error) {
    console.error('Deployment error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Deployment failed' },
      { status: 500 }
    )
  }
}

async function createSupabaseProject(token: string, projectName: string) {
  // Get user's organization
  const orgsResponse = await fetch('https://api.supabase.com/v1/organizations', {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!orgsResponse.ok) {
    throw new Error('Failed to get Supabase organizations')
  }

  const orgs = await orgsResponse.json()
  const orgId = orgs[0]?.id

  if (!orgId) {
    throw new Error('No Supabase organization found. Please create one at supabase.com')
  }

  // Create project
  const createResponse = await fetch('https://api.supabase.com/v1/projects', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: `openboard-${projectName}`,
      organization_id: orgId,
      region: 'us-east-1',
      plan: 'free',
      db_pass: generatePassword(),
    }),
  })

  if (!createResponse.ok) {
    const error = await createResponse.text()
    throw new Error(`Failed to create Supabase project: ${error}`)
  }

  const project = await createResponse.json()

  // Wait for project to be ready
  await waitForSupabaseProject(token, project.id)

  // Get API keys
  const keysResponse = await fetch(
    `https://api.supabase.com/v1/projects/${project.id}/api-keys`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!keysResponse.ok) {
    throw new Error('Failed to get Supabase API keys')
  }

  const keys = await keysResponse.json()
  const anonKey = keys.find((k: any) => k.name === 'anon')?.api_key
  const serviceRoleKey = keys.find((k: any) => k.name === 'service_role')?.api_key

  return {
    id: project.id,
    url: `https://${project.id}.supabase.co`,
    anonKey,
    serviceRoleKey,
    dashboardUrl: `https://supabase.com/dashboard/project/${project.id}`,
  }
}

async function waitForSupabaseProject(token: string, projectId: string) {
  const maxAttempts = 60 // 5 minutes
  let attempts = 0

  while (attempts < maxAttempts) {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (response.ok) {
      const project = await response.json()
      if (project.status === 'ACTIVE_HEALTHY') {
        return project
      }
    }

    await new Promise(resolve => setTimeout(resolve, 5000))
    attempts++
  }

  throw new Error('Supabase project creation timed out')
}

async function runSupabaseMigrations(project: { id: string; url: string; serviceRoleKey: string }) {
  // Run SQL to create tables - matches supabase/schema.sql
  const sql = `
    -- Boards table
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      owner_session TEXT,
      name TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Pages table
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      board_id TEXT REFERENCES boards(id) ON DELETE CASCADE,
      page_index INTEGER NOT NULL,
      name TEXT,
      canvas_data TEXT,
      thumbnail TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Index for faster page lookups
    CREATE INDEX IF NOT EXISTS pages_board_id_idx ON pages(board_id);
    CREATE INDEX IF NOT EXISTS pages_board_index_idx ON pages(board_id, page_index);

    -- Enable RLS
    ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
    ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

    -- Boards policies
    CREATE POLICY "Public read access for boards" ON boards
      FOR SELECT USING (true);

    CREATE POLICY "Owner can insert boards" ON boards
      FOR INSERT WITH CHECK (
        auth.uid() = owner_id OR
        owner_id IS NULL
      );

    CREATE POLICY "Owner can update boards" ON boards
      FOR UPDATE USING (
        auth.uid() = owner_id OR
        (owner_id IS NULL AND owner_session IS NOT NULL)
      );

    CREATE POLICY "Owner can delete boards" ON boards
      FOR DELETE USING (
        auth.uid() = owner_id OR
        (owner_id IS NULL AND owner_session IS NOT NULL)
      );

    -- Pages policies
    CREATE POLICY "Public read access for pages" ON pages
      FOR SELECT USING (true);

    CREATE POLICY "Board owner can insert pages" ON pages
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM boards
          WHERE boards.id = pages.board_id
          AND (boards.owner_id = auth.uid() OR boards.owner_id IS NULL)
        )
      );

    CREATE POLICY "Board owner can update pages" ON pages
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM boards
          WHERE boards.id = pages.board_id
          AND (boards.owner_id = auth.uid() OR boards.owner_id IS NULL)
        )
      );

    CREATE POLICY "Board owner can delete pages" ON pages
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM boards
          WHERE boards.id = pages.board_id
          AND (boards.owner_id = auth.uid() OR boards.owner_id IS NULL)
        )
      );

    -- Update trigger function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Triggers for updated_at
    DROP TRIGGER IF EXISTS update_boards_updated_at ON boards;
    CREATE TRIGGER update_boards_updated_at
      BEFORE UPDATE ON boards
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS update_pages_updated_at ON pages;
    CREATE TRIGGER update_pages_updated_at
      BEFORE UPDATE ON pages
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  `

  const response = await fetch(`${project.url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${project.serviceRoleKey}`,
      apikey: project.serviceRoleKey,
    },
    body: JSON.stringify({ query: sql }),
  })

  // Note: This might fail if the function doesn't exist
  // In production, use Supabase migrations or the SQL editor API
  if (!response.ok) {
    console.warn('Migration via RPC failed, tables may need manual creation')
  }
}

async function deployToVercel(
  token: string,
  teamId: string | undefined,
  projectName: string,
  envVars: Record<string, string>
) {
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  // Create project from GitHub repo
  const createResponse = await fetch('https://api.vercel.com/v10/projects', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: projectName,
      framework: 'nextjs',
      gitRepository: {
        type: 'github',
        repo: OPENBOARD_REPO.replace('https://github.com/', ''),
      },
      ...(teamId && { teamId }),
    }),
  })

  if (!createResponse.ok) {
    const error = await createResponse.text()
    throw new Error(`Failed to create Vercel project: ${error}`)
  }

  const project = await createResponse.json()

  // Set environment variables
  for (const [key, value] of Object.entries(envVars)) {
    await fetch(`https://api.vercel.com/v10/projects/${project.id}/env`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        key,
        value,
        type: 'encrypted',
        target: ['production', 'preview', 'development'],
        ...(teamId && { teamId }),
      }),
    })
  }

  // Trigger deployment
  const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: projectName,
      project: project.id,
      target: 'production',
      gitSource: {
        type: 'github',
        repo: OPENBOARD_REPO.replace('https://github.com/', ''),
        ref: 'main',
      },
      ...(teamId && { teamId }),
    }),
  })

  if (!deployResponse.ok) {
    const error = await deployResponse.text()
    throw new Error(`Failed to deploy to Vercel: ${error}`)
  }

  const deployment = await deployResponse.json()

  return {
    id: deployment.id,
    url: `https://${projectName}.vercel.app`,
    dashboardUrl: `https://vercel.com/${teamId || 'dashboard'}/${projectName}`,
  }
}

function generatePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < 24; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}
