'use client'

import { useRef, useCallback, useEffect, useState } from 'react'
import { Canvas } from 'fabric'
import { jsPDF } from 'jspdf'
import { HistoryManager } from '@/lib/history'
import { StorageManager } from '@/lib/storage'
import { exportToPNG, exportToSVG, exportToJSON, importFromJSON } from '@/lib/export'
import { CollaborationProvider, UserAwareness } from '@/lib/collaboration/yjs-provider'
import { CanvasSync } from '@/lib/collaboration/sync'
import { useCanvasStore } from '@/stores/canvas-store'
import { usePagesStore } from '@/stores/pages-store'
import { canEditBoard, claimBoardOwnership, getViewOnlyLink, getEditLink, transferBoardOwnership } from '@/lib/permissions'
import { useAuth } from '@/contexts/AuthContext'

const PAGES_SAVE_DELAY = 3000 // Save pages every 3 seconds after changes

export function useWhiteboard(boardId: string) {
  const canvasRef = useRef<Canvas | null>(null)
  const historyRef = useRef<HistoryManager | null>(null)
  const storageRef = useRef<StorageManager | null>(null)
  const collaborationRef = useRef<CollaborationProvider | null>(null)
  const syncRef = useRef<CanvasSync | null>(null)
  const pagesSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pagesLoadedRef = useRef(false)

  const [collaborators, setCollaborators] = useState<UserAwareness[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [canEdit, setCanEdit] = useState(true)
  const [isLoading, setIsLoading] = useState(true)

  const { setCanUndo, setCanRedo } = useCanvasStore()
  const { pages, currentPageIndex, updatePageData, addPage, setPages } = usePagesStore()
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

  const initCanvas = useCallback(async (canvas: Canvas) => {
    canvasRef.current = canvas

    // Initialize history
    historyRef.current = new HistoryManager((canUndo, canRedo) => {
      setCanUndo(canUndo)
      setCanRedo(canRedo)
    })
    historyRef.current.init(canvas)

    // Initialize storage with user ID
    const userId = user?.id || null
    storageRef.current = new StorageManager(boardId, userId)
    storageRef.current.init(canvas)

    // Load pages from storage
    if (!pagesLoadedRef.current) {
      pagesLoadedRef.current = true
      const savedPages = await storageRef.current.loadPages()
      if (savedPages.length > 0) {
        setPages(savedPages)
        // Load first page's canvas data
        const firstPage = savedPages[0]
        if (firstPage.canvasData) {
          try {
            await canvas.loadFromJSON(firstPage.canvasData)
            canvas.renderAll()
          } catch (e) {
            console.error('Failed to load first page:', e)
          }
        }
      }
      setIsLoading(false)
    }

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
  }, [boardId, setCanUndo, setCanRedo, user, setPages])

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

  // Generate thumbnail from current canvas
  const generateThumbnail = useCallback((): string | null => {
    if (!canvasRef.current) return null

    try {
      const dataUrl = canvasRef.current.toDataURL({
        format: 'png',
        quality: 0.3,
        multiplier: 0.2, // Small thumbnail
      })
      return dataUrl
    } catch {
      return null
    }
  }, [])

  // Save current page's canvas data
  const saveCurrentPage = useCallback(() => {
    if (!canvasRef.current) return

    const canvasData = JSON.stringify(canvasRef.current.toJSON())
    const thumbnail = generateThumbnail()
    updatePageData(currentPageIndex, canvasData, thumbnail || undefined)
  }, [currentPageIndex, updatePageData, generateThumbnail])

  // Load a page's canvas data
  const loadPage = useCallback((pageIndex: number) => {
    if (!canvasRef.current) return

    const page = pages[pageIndex]
    if (!page) return

    // Clear current canvas
    canvasRef.current.clear()
    canvasRef.current.backgroundColor = '#ffffff'

    // Load page data if it exists
    if (page.canvasData) {
      try {
        canvasRef.current.loadFromJSON(page.canvasData, () => {
          canvasRef.current?.renderAll()
        })
      } catch (error) {
        console.error('Error loading page:', error)
        canvasRef.current.renderAll()
      }
    } else {
      canvasRef.current.renderAll()
    }
  }, [pages])

  // Add a new page
  const addNewPage = useCallback(() => {
    if (!canvasRef.current) return

    // Save current page first
    saveCurrentPage()

    // Add new page to store (this also sets it as current)
    addPage()

    // Clear canvas for the new blank page
    canvasRef.current.clear()
    canvasRef.current.backgroundColor = '#ffffff'
    canvasRef.current.renderAll()
  }, [saveCurrentPage, addPage])

  // Export all pages as PDF
  const exportPDF = useCallback(async () => {
    if (!canvasRef.current) return

    // Save current page first
    saveCurrentPage()

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvasRef.current.width || 800, canvasRef.current.height || 600],
    })

    const originalPageIndex = currentPageIndex

    for (let i = 0; i < pages.length; i++) {
      // Load each page
      const page = pages[i]

      if (i > 0) {
        pdf.addPage([canvasRef.current.width || 800, canvasRef.current.height || 600], 'landscape')
      }

      // If this page has data, load and render it
      if (page.canvasData) {
        await new Promise<void>((resolve) => {
          canvasRef.current!.loadFromJSON(page.canvasData!, () => {
            canvasRef.current!.renderAll()
            resolve()
          })
        })
      } else if (i === originalPageIndex) {
        // Current page, already loaded
      } else {
        // Empty page
        canvasRef.current.clear()
        canvasRef.current.backgroundColor = '#ffffff'
        canvasRef.current.renderAll()
      }

      // Add canvas image to PDF
      const imgData = canvasRef.current.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 2,
      })

      pdf.addImage(
        imgData,
        'PNG',
        0,
        0,
        canvasRef.current.width || 800,
        canvasRef.current.height || 600
      )
    }

    // Restore original page
    loadPage(originalPageIndex)

    // Download PDF
    pdf.save(`openboard-${boardId}.pdf`)
  }, [boardId, pages, currentPageIndex, saveCurrentPage, loadPage])

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

  // Save pages to storage when they change (debounced)
  useEffect(() => {
    // Don't save if pages haven't been loaded yet
    if (!pagesLoadedRef.current || !storageRef.current) return

    // Debounce saves
    if (pagesSaveTimeoutRef.current) {
      clearTimeout(pagesSaveTimeoutRef.current)
    }

    pagesSaveTimeoutRef.current = setTimeout(() => {
      storageRef.current?.savePages(pages)
    }, PAGES_SAVE_DELAY)

    return () => {
      if (pagesSaveTimeoutRef.current) {
        clearTimeout(pagesSaveTimeoutRef.current)
      }
    }
  }, [pages])

  // Save pages immediately before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (storageRef.current && pagesLoadedRef.current) {
        // Save current page first
        if (canvasRef.current) {
          const canvasData = JSON.stringify(canvasRef.current.toJSON())
          updatePageData(currentPageIndex, canvasData)
        }
        // Note: savePages is async but we can't await in beforeunload
        // localStorage backup in savePages will still work synchronously
        storageRef.current.savePages(pages)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [pages, currentPageIndex, updatePageData])

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
    exportPDF,
    importJSON,
    clearCanvas,
    collaborators,
    isConnected,
    canEdit,
    isLoading,
    getShareLink,
    getOwnerLink,
    // Page operations
    saveCurrentPage,
    loadPage,
    addNewPage,
    currentPageIndex,
    pages,
  }
}
