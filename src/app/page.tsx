'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { generateBoardId } from '@/lib/board-id'
import { StorageManager, BoardMetadata } from '@/lib/storage'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const router = useRouter()
  const [recentBoards, setRecentBoards] = useState<BoardMetadata[]>([])
  const { user } = useAuth()

  const loadRecentBoards = useCallback(async () => {
    const boards = await StorageManager.getRecentBoards(user?.id)
    setRecentBoards(boards)
  }, [user?.id])

  useEffect(() => {
    loadRecentBoards()
  }, [loadRecentBoards])

  const createNewBoard = () => {
    const boardId = generateBoardId()
    router.push(`/board/${boardId}`)
  }

  const openBoard = (boardId: string) => {
    router.push(`/board/${boardId}`)
  }

  const deleteBoard = async (e: React.MouseEvent, boardId: string) => {
    e.stopPropagation()
    if (confirm('Delete this board? This cannot be undone.')) {
      StorageManager.deleteBoard(boardId)
      await loadRecentBoards()
    }
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center p-8">
      <div className="text-center max-w-4xl w-full">
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

        {/* Recent Boards */}
        {recentBoards.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Boards</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {recentBoards.slice(0, 8).map((board) => (
                <div
                  key={board.id}
                  onClick={() => openBoard(board.id)}
                  className="bg-slate-800/50 hover:bg-slate-700/50 p-4 rounded-lg cursor-pointer transition-colors group relative"
                >
                  <div className="text-white font-medium truncate">{board.name}</div>
                  <div className="text-slate-400 text-sm mt-1">
                    {formatDate(board.lastModified)}
                  </div>
                  <button
                    onClick={(e) => deleteBoard(e, board.id)}
                    className="absolute top-2 right-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                    title="Delete board"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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

        <div className="mt-8 text-slate-500 text-sm">
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">
            View on GitHub
          </a>
        </div>
      </div>
    </main>
  )
}
