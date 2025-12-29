'use client'

import { useState } from 'react'
import SetupWizard from '@/components/SetupWizard'

export default function Home() {
  const [started, setStarted] = useState(false)

  if (started) {
    return <SetupWizard />
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div className="max-w-2xl text-center text-white">
        <h1 className="text-5xl font-bold mb-6">
          Deploy Your Own Whiteboard
        </h1>
        <p className="text-xl text-blue-100 mb-8">
          Get your own OpenBoard instance running in 3 clicks.
          No coding required. Free forever.
        </p>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6">What you will get:</h2>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-3xl mb-2">🎨</div>
              <h3 className="font-semibold mb-1">Your Whiteboard</h3>
              <p className="text-sm text-blue-100">
                Full-featured collaborative whiteboard at your-name.vercel.app
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-3xl mb-2">🔒</div>
              <h3 className="font-semibold mb-1">Your Data</h3>
              <p className="text-sm text-blue-100">
                Everything stored in your own accounts. You own it all.
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4">
              <div className="text-3xl mb-2">💰</div>
              <h3 className="font-semibold mb-1">Free Forever</h3>
              <p className="text-sm text-blue-100">
                Uses free tiers of Vercel, Supabase, and Railway.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setStarted(true)}
          className="bg-white text-blue-600 px-8 py-4 rounded-xl text-xl font-semibold hover:bg-blue-50 transition-colors shadow-lg"
        >
          Get Started (3 minutes)
        </button>

        <p className="mt-6 text-sm text-blue-200">
          You will need to create free accounts on Vercel, Supabase, and Railway if you do not have them.
        </p>
      </div>
    </main>
  )
}
