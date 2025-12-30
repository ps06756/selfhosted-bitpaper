'use client'

import { useState } from 'react'

type Step = 'vercel' | 'supabase' | 'deploy' | 'done'

interface ConnectionStatus {
  vercel: boolean
  supabase: boolean
}

export default function SetupWizard() {
  const [currentStep, setCurrentStep] = useState<Step>('vercel')
  const [connections, setConnections] = useState<ConnectionStatus>({
    vercel: false,
    supabase: false,
  })
  const [projectName, setProjectName] = useState('')
  const [deploying, setDeploying] = useState(false)
  const [deployedUrl, setDeployedUrl] = useState('')
  const [error, setError] = useState('')

  const steps: { id: Step; label: string; description: string }[] = [
    { id: 'vercel', label: 'Connect Vercel', description: 'For hosting your app' },
    { id: 'supabase', label: 'Connect Supabase', description: 'For database & auth' },
    { id: 'deploy', label: 'Deploy', description: 'Launch your whiteboard' },
  ]

  const connectVercel = () => {
    // OAuth flow - redirect to Vercel OAuth
    const clientId = process.env.NEXT_PUBLIC_VERCEL_CLIENT_ID
    const redirectUri = `${window.location.origin}/api/auth/vercel/callback`
    const scope = 'user'

    if (!clientId) {
      setError('Vercel OAuth not configured. Please set NEXT_PUBLIC_VERCEL_CLIENT_ID')
      return
    }

    window.location.href = `https://vercel.com/integrations/openboard/new?` +
      new URLSearchParams({
        redirect_uri: redirectUri,
      }).toString()
  }

  const connectSupabase = () => {
    // For Supabase, we'll use their Management API
    // This requires the user to create a project and get credentials
    const clientId = process.env.NEXT_PUBLIC_SUPABASE_CLIENT_ID
    const redirectUri = `${window.location.origin}/api/auth/supabase/callback`

    if (!clientId) {
      setError('Supabase OAuth not configured. Please set NEXT_PUBLIC_SUPABASE_CLIENT_ID')
      return
    }

    window.location.href = `https://api.supabase.com/v1/oauth/authorize?` +
      new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'all',
      }).toString()
  }

  const deploy = async () => {
    if (!projectName.trim()) {
      setError('Please enter a project name')
      return
    }

    setDeploying(true)
    setError('')

    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: projectName.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Deployment failed')
      }

      setDeployedUrl(data.url)
      setCurrentStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed')
    } finally {
      setDeploying(false)
    }
  }

  // Check URL params for OAuth callbacks
  useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)

      if (params.get('vercel') === 'connected') {
        setConnections(prev => ({ ...prev, vercel: true }))
        setCurrentStep('supabase')
        window.history.replaceState({}, '', window.location.pathname)
      }

      if (params.get('supabase') === 'connected') {
        setConnections(prev => ({ ...prev, supabase: true }))
        setCurrentStep('deploy')
        window.history.replaceState({}, '', window.location.pathname)
      }

      if (params.get('error')) {
        setError(params.get('error') || 'Connection failed')
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  })

  if (currentStep === 'done') {
    return (
      <main className="min-h-screen bg-gradient-to-br from-green-600 to-emerald-700 flex items-center justify-center p-4">
        <div className="max-w-xl text-center text-white">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-4xl font-bold mb-4">You Are All Set!</h1>
          <p className="text-xl text-green-100 mb-8">
            Your whiteboard is now live and ready to use.
          </p>

          <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-8">
            <p className="text-sm text-green-200 mb-2">Your whiteboard URL:</p>
            <a
              href={deployedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-2xl font-mono font-bold hover:underline"
            >
              {deployedUrl}
            </a>
          </div>

          <div className="space-y-4">
            <a
              href={deployedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white text-green-600 px-8 py-4 rounded-xl text-xl font-semibold hover:bg-green-50 transition-colors"
            >
              Open My Whiteboard
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(deployedUrl)
                alert('URL copied to clipboard!')
              }}
              className="block w-full bg-white/20 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/30 transition-colors"
            >
              Copy URL
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Progress Steps */}
        <div className="flex justify-between mb-12">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep === step.id
                      ? 'bg-blue-600 text-white'
                      : connections[step.id as keyof ConnectionStatus]
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {connections[step.id as keyof ConnectionStatus] ? '✓' : index + 1}
                </div>
                <span className="text-xs mt-2 text-gray-600">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className="w-16 md:w-24 h-1 bg-gray-200 mx-2 mt-[-12px]" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {currentStep === 'vercel' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl font-bold">▲</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Connect Vercel</h2>
              <p className="text-gray-600 mb-6">
                Vercel will host your whiteboard app. It is free and takes 30 seconds to set up.
              </p>
              <button
                onClick={connectVercel}
                className="bg-black text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-800 transition-colors"
              >
                Connect Vercel Account
              </button>
              <p className="text-sm text-gray-500 mt-4">
                No account yet?{' '}
                <a
                  href="https://vercel.com/signup"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Sign up free
                </a>
              </p>
            </div>
          )}

          {currentStep === 'supabase' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">⚡</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Connect Supabase</h2>
              <p className="text-gray-600 mb-6">
                Supabase provides your database and authentication. Also free!
              </p>
              <button
                onClick={connectSupabase}
                className="bg-emerald-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-emerald-700 transition-colors"
              >
                Connect Supabase Account
              </button>
              <p className="text-sm text-gray-500 mt-4">
                No account yet?{' '}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Sign up free
                </a>
              </p>
            </div>
          )}

          {currentStep === 'deploy' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-2xl">🚀</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Deploy Your Whiteboard</h2>
              <p className="text-gray-600 mb-6">
                All accounts connected! Choose a name and we will set everything up.
              </p>

              <div className="max-w-sm mx-auto mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2 text-left">
                  Project Name
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    placeholder="my-classroom"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-l-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                  <span className="px-4 py-3 bg-gray-100 border border-l-0 border-gray-300 rounded-r-xl text-gray-500">
                    .vercel.app
                  </span>
                </div>
              </div>

              <button
                onClick={deploy}
                disabled={deploying || !projectName.trim()}
                className="bg-blue-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deploying ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deploying...
                  </span>
                ) : (
                  'Deploy My Whiteboard'
                )}
              </button>

              {deploying && (
                <div className="mt-6 text-sm text-gray-600">
                  <p>This usually takes 1-2 minutes. We are:</p>
                  <ul className="mt-2 space-y-1">
                    <li>✓ Creating your Supabase database...</li>
                    <li>✓ Setting up authentication...</li>
                    <li>✓ Running database migrations...</li>
                    <li>✓ Deploying your app to Vercel...</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Back Button */}
        {currentStep !== 'vercel' && (
          <button
            onClick={() => {
              const stepOrder: Step[] = ['vercel', 'supabase', 'deploy', 'done']
              const currentIndex = stepOrder.indexOf(currentStep)
              if (currentIndex > 0) {
                setCurrentStep(stepOrder[currentIndex - 1])
              }
            }}
            className="mt-4 text-gray-500 hover:text-gray-700"
          >
            ← Back
          </button>
        )}
      </div>
    </main>
  )
}
