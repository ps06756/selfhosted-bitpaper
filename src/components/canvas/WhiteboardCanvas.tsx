'use client'

import { useEffect, useRef } from 'react'
import { Canvas, PencilBrush, FabricObject, Rect, Ellipse, Line, IText, Polygon } from 'fabric'
import { useCanvasStore } from '@/stores/canvas-store'
import { useWhiteboardContext } from '@/contexts/WhiteboardContext'
import { Tool } from '@/types/canvas'

interface WhiteboardCanvasProps {
  boardId: string
}

export default function WhiteboardCanvas({ boardId }: WhiteboardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isDrawingShapeRef = useRef(false)
  const startPointRef = useRef<{ x: number; y: number } | null>(null)
  const currentShapeRef = useRef<FabricObject | null>(null)

  const { tool, strokeColor, strokeWidth, fillColor, setTool } = useCanvasStore()
  const { initCanvas } = useWhiteboardContext()

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

    // Initialize whiteboard context (history + storage)
    initCanvas(canvas)

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
  }, [initCanvas])

  // Update drawing mode based on tool
  useEffect(() => {
    if (!fabricRef.current) return
    const canvas = fabricRef.current

    const isDrawingTool = ['pen', 'marker', 'highlighter'].includes(tool)
    const isShapeTool = ['rectangle', 'circle', 'line', 'arrow'].includes(tool)

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
    } else if (!isShapeTool && tool !== 'text') {
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

  // Handle keyboard shortcuts for tools and delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fabricRef.current) return

      // Don't handle shortcuts when typing in text
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const activeObj = fabricRef.current.getActiveObject()
      if (activeObj && activeObj.type === 'i-text' && (activeObj as IText).isEditing) return

      // Delete selected objects
      if ((e.key === 'Delete' || e.key === 'Backspace') && tool === 'select') {
        const activeObjects = fabricRef.current.getActiveObjects()
        if (activeObjects.length > 0) {
          activeObjects.forEach((obj) => fabricRef.current?.remove(obj))
          fabricRef.current.discardActiveObject()
          fabricRef.current.renderAll()
        }
        e.preventDefault()
        return
      }

      // Tool shortcuts
      const shortcuts: Record<string, Tool> = {
        'v': 'select',
        'p': 'pen',
        'm': 'marker',
        'h': 'highlighter',
        'r': 'rectangle',
        'o': 'circle',
        'l': 'line',
        'a': 'arrow',
        't': 'text',
        'e': 'eraser',
      }

      const shortcutTool = shortcuts[e.key.toLowerCase()]
      if (shortcutTool) {
        setTool(shortcutTool)
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [tool, setTool])

  // Shape drawing and eraser functionality
  useEffect(() => {
    if (!fabricRef.current) return
    const canvas = fabricRef.current

    const isShapeTool = ['rectangle', 'circle', 'line', 'arrow'].includes(tool)

    const handleMouseDown = (e: any) => {
      // Eraser
      if (tool === 'eraser') {
        const target = canvas.findTarget(e.e)
        if (target) {
          canvas.remove(target)
          canvas.renderAll()
        }
        return
      }

      // Text tool
      if (tool === 'text') {
        const pointer = canvas.getScenePoint(e.e)
        const text = new IText('Type here...', {
          left: pointer.x,
          top: pointer.y,
          fontSize: strokeWidth * 6,
          fill: strokeColor,
          fontFamily: 'Arial',
        })
        canvas.add(text)
        canvas.setActiveObject(text)
        text.enterEditing()
        text.selectAll()
        canvas.renderAll()
        return
      }

      // Shape tools
      if (!isShapeTool) return

      isDrawingShapeRef.current = true
      const pointer = canvas.getScenePoint(e.e)
      startPointRef.current = { x: pointer.x, y: pointer.y }

      let shape: FabricObject | null = null

      if (tool === 'rectangle') {
        shape = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: fillColor === 'transparent' ? 'transparent' : fillColor,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          selectable: false,
          evented: false,
        })
      } else if (tool === 'circle') {
        shape = new Ellipse({
          left: pointer.x,
          top: pointer.y,
          rx: 0,
          ry: 0,
          fill: fillColor === 'transparent' ? 'transparent' : fillColor,
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          selectable: false,
          evented: false,
        })
      } else if (tool === 'line' || tool === 'arrow') {
        shape = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: strokeColor,
          strokeWidth: strokeWidth,
          selectable: false,
          evented: false,
        })
      }

      if (shape) {
        currentShapeRef.current = shape
        canvas.add(shape)
      }
    }

    const handleMouseMove = (e: any) => {
      if (!isDrawingShapeRef.current || !startPointRef.current || !currentShapeRef.current) return

      const pointer = canvas.getScenePoint(e.e)
      const startX = startPointRef.current.x
      const startY = startPointRef.current.y

      if (tool === 'rectangle') {
        const rect = currentShapeRef.current as Rect
        const width = pointer.x - startX
        const height = pointer.y - startY

        rect.set({
          left: width < 0 ? pointer.x : startX,
          top: height < 0 ? pointer.y : startY,
          width: Math.abs(width),
          height: Math.abs(height),
        })
      } else if (tool === 'circle') {
        const ellipse = currentShapeRef.current as Ellipse
        const rx = Math.abs(pointer.x - startX) / 2
        const ry = Math.abs(pointer.y - startY) / 2

        ellipse.set({
          left: Math.min(startX, pointer.x),
          top: Math.min(startY, pointer.y),
          rx: rx,
          ry: ry,
        })
      } else if (tool === 'line' || tool === 'arrow') {
        const line = currentShapeRef.current as Line
        line.set({
          x2: pointer.x,
          y2: pointer.y,
        })
      }

      canvas.renderAll()
    }

    const handleMouseUp = () => {
      if (!isDrawingShapeRef.current || !currentShapeRef.current) return

      // Add arrowhead if arrow tool
      if (tool === 'arrow' && currentShapeRef.current) {
        const line = currentShapeRef.current as Line
        const x1 = line.x1 || 0
        const y1 = line.y1 || 0
        const x2 = line.x2 || 0
        const y2 = line.y2 || 0

        // Calculate arrowhead
        const angle = Math.atan2(y2 - y1, x2 - x1)
        const headLength = strokeWidth * 4

        const arrowHead = new Polygon([
          { x: x2, y: y2 },
          { x: x2 - headLength * Math.cos(angle - Math.PI / 6), y: y2 - headLength * Math.sin(angle - Math.PI / 6) },
          { x: x2 - headLength * Math.cos(angle + Math.PI / 6), y: y2 - headLength * Math.sin(angle + Math.PI / 6) },
        ], {
          fill: strokeColor,
          stroke: strokeColor,
          strokeWidth: 1,
          selectable: false,
          evented: false,
        })

        canvas.add(arrowHead)
      }

      // Make shape selectable
      currentShapeRef.current.set({
        selectable: true,
        evented: true,
      })

      isDrawingShapeRef.current = false
      startPointRef.current = null
      currentShapeRef.current = null
      canvas.renderAll()
    }

    canvas.on('mouse:down', handleMouseDown)
    canvas.on('mouse:move', handleMouseMove)
    canvas.on('mouse:up', handleMouseUp)

    return () => {
      canvas.off('mouse:down', handleMouseDown)
      canvas.off('mouse:move', handleMouseMove)
      canvas.off('mouse:up', handleMouseUp)
    }
  }, [tool, strokeColor, strokeWidth, fillColor])

  return (
    <div ref={containerRef} className="w-full h-full cursor-crosshair">
      <canvas ref={canvasRef} />
    </div>
  )
}
