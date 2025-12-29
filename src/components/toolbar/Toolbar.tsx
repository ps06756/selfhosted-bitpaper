'use client'

import { useCanvasStore } from '@/stores/canvas-store'
import { Tool } from '@/types/canvas'

interface ToolbarProps {
  boardId: string
}

const tools: { id: Tool; label: string; icon: string; shortcut?: string }[] = [
  { id: 'select', label: 'Select (V)', icon: '↖', shortcut: 'V' },
  { id: 'pen', label: 'Pen (P)', icon: '✏️', shortcut: 'P' },
  { id: 'marker', label: 'Marker (M)', icon: '🖊️', shortcut: 'M' },
  { id: 'highlighter', label: 'Highlighter (H)', icon: '🖍️', shortcut: 'H' },
  { id: 'rectangle', label: 'Rectangle (R)', icon: '▢', shortcut: 'R' },
  { id: 'circle', label: 'Circle (O)', icon: '○', shortcut: 'O' },
  { id: 'line', label: 'Line (L)', icon: '╱', shortcut: 'L' },
  { id: 'arrow', label: 'Arrow (A)', icon: '→', shortcut: 'A' },
  { id: 'text', label: 'Text (T)', icon: 'T', shortcut: 'T' },
  { id: 'eraser', label: 'Eraser (E)', icon: '🧹', shortcut: 'E' },
]

const colors = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
]

const strokeWidths = [2, 4, 6, 10, 16]

export default function Toolbar({ boardId }: ToolbarProps) {
  const { tool, setTool, strokeColor, setStrokeColor, strokeWidth, setStrokeWidth } = useCanvasStore()

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    alert('Link copied to clipboard!')
  }

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-4 shadow-sm">
      {/* Logo / Board name */}
      <div className="font-semibold text-gray-700 mr-4">
        OpenBoard
      </div>

      {/* Tool buttons */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-4">
        {tools.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`p-2 rounded-lg transition-colors ${
              tool === t.id
                ? 'bg-blue-100 text-blue-700'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title={t.label}
          >
            <span className="text-lg">{t.icon}</span>
          </button>
        ))}
      </div>

      {/* Color picker */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-4">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => setStrokeColor(color)}
            className={`w-6 h-6 rounded-full border-2 transition-transform ${
              strokeColor === color ? 'border-blue-500 scale-110' : 'border-gray-300'
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>

      {/* Stroke width */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-4">
        {strokeWidths.map((width) => (
          <button
            key={width}
            onClick={() => setStrokeWidth(width)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              strokeWidth === width
                ? 'bg-blue-100 text-blue-700'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
            title={`${width}px`}
          >
            <div
              className="rounded-full bg-current"
              style={{ width: Math.min(width, 16), height: Math.min(width, 16) }}
            />
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Share button */}
      <button
        onClick={copyLink}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        Share Link
      </button>
    </div>
  )
}
