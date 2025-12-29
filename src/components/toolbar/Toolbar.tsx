'use client'

import { useState, useRef } from 'react'
import { useCanvasStore } from '@/stores/canvas-store'
import { useWhiteboardContext } from '@/contexts/WhiteboardContext'
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
  const { tool, setTool, strokeColor, setStrokeColor, strokeWidth, setStrokeWidth, canUndo, canRedo } = useCanvasStore()
  const { undo, redo, exportPNG, exportSVG, exportJSON, importJSON, clearCanvas, collaborators, isConnected } = useWhiteboardContext()
  const [showExportMenu, setShowExportMenu] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    alert('Link copied to clipboard!')
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      importJSON(file).then(() => {
        alert('Board imported successfully!')
      }).catch((err) => {
        alert('Failed to import: ' + err.message)
      })
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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

      {/* Undo/Redo */}
      <div className="flex items-center gap-1 border-r border-gray-200 pr-4">
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`p-2 rounded-lg transition-colors ${
            canUndo ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <span className="text-lg">↩️</span>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`p-2 rounded-lg transition-colors ${
            canRedo ? 'hover:bg-gray-100 text-gray-600' : 'text-gray-300 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Shift+Z)"
        >
          <span className="text-lg">↪️</span>
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Clear canvas */}
      <button
        onClick={() => {
          if (confirm('Clear the entire canvas? This cannot be undone.')) {
            clearCanvas()
          }
        }}
        className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
        title="Clear canvas"
      >
        Clear
      </button>

      {/* Export menu */}
      <div className="relative">
        <button
          onClick={() => setShowExportMenu(!showExportMenu)}
          className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
        >
          Export
        </button>
        {showExportMenu && (
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px] z-50">
            <button
              onClick={() => { exportPNG(); setShowExportMenu(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Export as PNG
            </button>
            <button
              onClick={() => { exportSVG(); setShowExportMenu(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Export as SVG
            </button>
            <button
              onClick={() => { exportJSON(); setShowExportMenu(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Export as JSON
            </button>
            <hr className="my-1 border-gray-200" />
            <button
              onClick={() => { fileInputRef.current?.click(); setShowExportMenu(false); }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              Import JSON
            </button>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
      </div>

      {/* Connection status */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`} />
        <span className="text-sm text-gray-600">
          {isConnected ? (
            collaborators.length > 0
              ? `${collaborators.length + 1} online`
              : 'Connected'
          ) : 'Connecting...'}
        </span>
        {collaborators.length > 0 && (
          <div className="flex -space-x-2">
            {collaborators.slice(0, 3).map((user) => (
              <div
                key={user.id}
                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: user.color }}
                title={user.name}
              >
                {user.name[0]}
              </div>
            ))}
            {collaborators.length > 3 && (
              <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-white text-xs font-medium">
                +{collaborators.length - 3}
              </div>
            )}
          </div>
        )}
      </div>

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
