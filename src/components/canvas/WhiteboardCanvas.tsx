'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Canvas, PencilBrush, FabricObject } from 'fabric'
import { useCanvasStore } from '@/stores/canvas-store'

interface WhiteboardCanvasProps {
  boardId: string
}

export default function WhiteboardCanvas({ boardId }: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { tool, strokeColor, strokeWidth } = useCanvasStore()

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || fabricRef.current) return

    const canvas = new Canvas(canvasRef.current, {
      isDrawingMode: true,
      backgroundColor: '#ffffff',
      selection: true,
    })

    // Set up pencil brush
    const brush = new PencilBrush(canvas)
    brush.color = strokeColor
    brush.width = strokeWidth
    canvas.freeDrawingBrush = brush

    fabricRef.current = canvas

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current || !fabricRef.current) return
      const { width, height } = containerRef.current.getBoundingClientRect()
      fabricRef.current.setDimensions({ width, height })
      fabricRef.current.renderAll()
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      canvas.dispose()
      fabricRef.current = null
    }
  }, [])

  // Update drawing mode based on tool
  useEffect(() => {
    if (!fabricRef.current) return
    const canvas = fabricRef.current

    const isDrawingTool = ['pen', 'marker', 'highlighter'].includes(tool)
    canvas.isDrawingMode = isDrawingTool

    if (isDrawingTool && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = strokeColor
      canvas.freeDrawingBrush.width = tool === 'marker' ? strokeWidth * 2 :
                                       tool === 'highlighter' ? strokeWidth * 4 : strokeWidth

      // Highlighter has transparency
      if (tool === 'highlighter') {
        canvas.freeDrawingBrush.color = strokeColor + '80' // 50% opacity
      }
    }

    // Selection mode
    if (tool === 'select') {
      canvas.selection = true
      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = true
        obj.evented = true
      })
    } else {
      canvas.selection = false
      canvas.discardActiveObject()
      canvas.forEachObject((obj: FabricObject) => {
        obj.selectable = false
        obj.evented = false
      })
    }

    canvas.renderAll()
  }, [tool, strokeColor, strokeWidth])

  // Update brush color and width
  useEffect(() => {
    if (!fabricRef.current?.freeDrawingBrush) return

    fabricRef.current.freeDrawingBrush.color = strokeColor
    fabricRef.current.freeDrawingBrush.width = strokeWidth
  }, [strokeColor, strokeWidth])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fabricRef.current) return

      // Delete selected objects
      if ((e.key === 'Delete' || e.key === 'Backspace') && tool === 'select') {
        const activeObjects = fabricRef.current.getActiveObjects()
        if (activeObjects.length > 0) {
          activeObjects.forEach((obj) => fabricRef.current?.remove(obj))
          fabricRef.current.discardActiveObject()
          fabricRef.current.renderAll()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tool])

  // Eraser functionality
  useEffect(() => {
    if (!fabricRef.current) return
    const canvas = fabricRef.current

    const handleMouseDown = (e: any) => {
      if (tool !== 'eraser') return
      const target = canvas.findTarget(e.e)
      if (target) {
        canvas.remove(target)
        canvas.renderAll()
      }
    }

    canvas.on('mouse:down', handleMouseDown)
    return () => {
      canvas.off('mouse:down', handleMouseDown)
    }
  }, [tool])

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas ref={canvasRef} />
    </div>
  )
}
