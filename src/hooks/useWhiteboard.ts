'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { Canvas } from 'fabric'
import { HistoryManager } from '@/lib/history'
import { StorageManager } from '@/lib/storage'
import { exportToPNG, exportToSVG, exportToJSON, importFromJSON } from '@/lib/export'
import { CollaborationProvider, UserAwareness } from '@/lib/collaboration/yjs-provider'
import { CanvasSync } from '@/lib/collaboration/sync'
import { useCanvasStore } from '@/stores/canvas-store'
import { canEditBoard, claimBoardOwnership, getViewOnlyLink, getEditLink, transferBoardOwnership } from '@/lib/permissions'
import { useAuth } from '@/contexts/AuthContext'

export function useWhiteboard(boardId: string) {
  const canvasRef = useRef<Canvas | null>(null)
  const historyRef = useRef<HistoryManager | null>(null)
  const storageRef = useRef<StorageManager | null>(null)
  const collaborationRef = useRef<CollaborationProvider | null>(null)
  const syncRef = useRef<CanvasSync | null>(null)

  const [collaborators, setCollaborators] = useState<UserAwareness[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [canEdit, setCanEdit] = useState(true)

  const { setCanUndo, setCanRedo } = useCanvasStore()
  const { user } = useAuth()

  // Check edit permissions on mount and when user changes
  useEffect(() => {
    const userId = user?.id
    const hasEditPermission = canEditBoard(boardId, userId)
    setCanEdit(hasEditPermission)

    // Claim ownership if this is a new board and we can edit
    if (hasEditPermission) {
      claimBoardOwnership(boardId, userId)
    }

    // Transfer ownership to logged-in user if they created the board anonymously
    if (userId && hasEditPermission) {
      transferBoardOwnership(boardId, userId)
    }
  }, [boardId, user])

  const initCanvas = useCallback((canvas: Canvas) => {
    canvasRef.current = canvas

    // Initialize history
    historyRef.current = new HistoryManager((canUndo, canRedo) => {
      setCanUndo(canUndo)
      setCanRedo(canRedo)
    })
    historyRef.current.init(canvas)

    // Initialize storage
    storageRef.current = new StorageManager(boardId)
    storageRef.current.init(canvas)

    // Initialize collaboration
    collaborationRef.current = new CollaborationProvider(boardId)

    // Set up the onReady callback to initialize sync when provider is ready
    collaborationRef.current.onReady = () => {
      if (canvasRef.current && collaborationRef.current) {
        console.log('Provider ready, initializing sync...')
        syncRef.current = new CanvasSync(canvasRef.current, collaborationRef.current)

        // Handle collaborator changes
        syncRef.current.onUsersChange = (users) => {
          setCollaborators(users)
        }

        // Load remote state or sync current state
        const remoteObjects = collaborationRef.current.getAllObjects()
        if (remoteObjects.size > 0) {
          syncRef.current.loadRemoteState()
        } else {
          syncRef.current.syncCurrentState()
        }

        // Update connection status
        setIsConnected(collaborationRef.current.isConnected())
      }
    }

    // If provider is already ready (unlikely but handle it), init sync now
    if (collaborationRef.current.isReady) {
      collaborationRef.current.onReady()
    }
  }, [boardId, setCanUndo, setCanRedo])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      syncRef.current?.destroy()
      collaborationRef.current?.destroy()
    }
  }, [])

  // Check connection status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (collaborationRef.current) {
        setIsConnected(collaborationRef.current.isConnected())
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const undo = useCallback(() => {
    historyRef.current?.undo()
  }, [])

  const redo = useCallback(() => {
    historyRef.current?.redo()
  }, [])

  const exportPNG = useCallback(() => {
    if (canvasRef.current) {
      exportToPNG(canvasRef.current, `openboard-${boardId}.png`)
    }
  }, [boardId])

  const exportSVG = useCallback(() => {
    if (canvasRef.current) {
      exportToSVG(canvasRef.current, `openboard-${boardId}.svg`)
    }
  }, [boardId])

  const exportJSON = useCallback(() => {
    if (canvasRef.current) {
      exportToJSON(canvasRef.current, `openboard-${boardId}.json`)
    }
  }, [boardId])

  const importJSON = useCallback((file: File) => {
    if (canvasRef.current) {
      return importFromJSON(canvasRef.current, file)
    }
    return Promise.reject(new Error('Canvas not initialized'))
  }, [])

  const clearCanvas = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.clear()
      canvasRef.current.backgroundColor = '#ffffff'
      canvasRef.current.renderAll()
      historyRef.current?.saveState()

      // Clear remote objects too
      if (collaborationRef.current) {
        collaborationRef.current.syncAllObjects(new Map())
      }
    }
  }, [])

  // Handle keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle when typing
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      // Undo: Cmd/Ctrl + Z
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }

      // Redo: Cmd/Ctrl + Shift + Z or Cmd/Ctrl + Y
      if ((e.metaKey || e.ctrlKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  // Generate share links
  const getShareLink = useCallback(() => getViewOnlyLink(boardId), [boardId])
  const getOwnerLink = useCallback(() => getEditLink(boardId), [boardId])

  return {
    initCanvas,
    undo,
    redo,
    exportPNG,
    exportSVG,
    exportJSON,
    importJSON,
    clearCanvas,
    collaborators,
    isConnected,
    canEdit,
    getShareLink,
    getOwnerLink,
  }
}
