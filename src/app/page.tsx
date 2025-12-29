'use client'

import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

export default function Home() {
  const router = useRouter()

  const createNewBoard = () => {
    const boardId = uuidv4().slice(0, 8)
    router.push(`/board/${boardId}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-white mb-4">
          OpenBoard
        </h1>
        <p className="text-xl text-slate-300 mb-8">
          A free, open-source collaborative whiteboard.
          <br />
          No sign-up required. Just create and share.
        </p>

        <button
          onClick={createNewBoard}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-8 rounded-lg text-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          Create New Board
        </button>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-slate-800/50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Real-time Collaboration</h3>
            <p className="text-slate-400 text-sm">Work together with your team or students in real-time. No account needed.</p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Self-Hosted</h3>
            <p className="text-slate-400 text-sm">Deploy on Vercel in minutes. Your data stays with you.</p>
          </div>
          <div className="bg-slate-800/50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-white mb-2">Free Forever</h3>
            <p className="text-slate-400 text-sm">Open source and free. No subscriptions, no limits.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
