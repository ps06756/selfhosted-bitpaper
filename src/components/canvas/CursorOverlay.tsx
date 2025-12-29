'use client'

import { UserAwareness } from '@/lib/collaboration/yjs-provider'

interface CursorOverlayProps {
  users: UserAwareness[]
  zoom: number
  viewportTransform: number[] | null
}

export default function CursorOverlay({ users, zoom, viewportTransform }: CursorOverlayProps) {
  // Transform cursor position based on viewport
  const transformPoint = (x: number, y: number) => {
    if (!viewportTransform) return { x, y }

    return {
      x: x * zoom + viewportTransform[4],
      y: y * zoom + viewportTransform[5],
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {users.map((user) => {
        if (!user.cursor) return null

        const pos = transformPoint(user.cursor.x, user.cursor.y)

        return (
          <div
            key={user.id}
            className="absolute transition-all duration-75 ease-out"
            style={{
              left: pos.x,
              top: pos.y,
              transform: 'translate(-2px, -2px)',
            }}
          >
            {/* Cursor arrow */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
            >
              <path
                d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z"
                fill={user.color}
                stroke="white"
                strokeWidth="1.5"
              />
            </svg>

            {/* User name label */}
            <div
              className="absolute left-4 top-4 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: user.color }}
            >
              {user.name}
            </div>
          </div>
        )
      })}
    </div>
  )
}
