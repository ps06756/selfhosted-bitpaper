'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useWhiteboard } from '@/hooks/useWhiteboard'

type WhiteboardContextType = ReturnType<typeof useWhiteboard>

const WhiteboardContext = createContext<WhiteboardContextType | null>(null)

interface WhiteboardProviderProps {
  boardId: string
  children: ReactNode
}

export function WhiteboardProvider({ boardId, children }: WhiteboardProviderProps) {
  const whiteboard = useWhiteboard(boardId)

  return (
    <WhiteboardContext.Provider value={whiteboard}>
      {children}
    </WhiteboardContext.Provider>
  )
}

export function useWhiteboardContext() {
  const context = useContext(WhiteboardContext)
  if (!context) {
    throw new Error('useWhiteboardContext must be used within a WhiteboardProvider')
  }
  return context
}
