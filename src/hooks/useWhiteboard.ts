'use client'

import { useRef, useCallback, useEffect } from 'react'
import { Canvas } from 'fabric'
import { HistoryManager } from '@/lib/history'
import { StorageManager } from '@/lib/storage'
import { exportToPNG, exportToSVG, exportToJSON, importFromJSON } from '@/lib/export'
import { useCanvasStore } from '@/stores/canvas-store'

export function useWhiteboard(boardId: string) {
  const canvasRef = useRef<Canvas | null>(null)
  const historyRef = useRef<HistoryManager | null>(null)
  const storageRef = useRef<StorageManager | null>(null)

  const { setCanUndo, setCanRedo } = useCanvasStore()

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
  }, [boardId, setCanUndo, setCanRedo])

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

  return {
    initCanvas,
    undo,
    redo,
    exportPNG,
    exportSVG,
    exportJSON,
    importJSON,
    clearCanvas,
  }
}
