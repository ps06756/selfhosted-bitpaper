'use client'

import { useCanvasStore } from '@/stores/canvas-store'

interface ZoomControlsProps {
  onZoomIn: () => void
  onZoomOut: () => void
  onZoomReset: () => void
}

export default function ZoomControls({ onZoomIn, onZoomOut, onZoomReset }: ZoomControlsProps) {
  const { zoom } = useCanvasStore()

  return (
    <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 flex items-center gap-1 p-1">
      <button
        onClick={onZoomOut}
        className="p-2 hover:bg-gray-100 rounded transition-colors text-gray-600"
        title="Zoom Out (-)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      <button
        onClick={onZoomReset}
        className="px-3 py-1 hover:bg-gray-100 rounded transition-colors text-sm text-gray-700 font-medium min-w-[60px]"
        title="Reset Zoom (0)"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={onZoomIn}
        className="p-2 hover:bg-gray-100 rounded transition-colors text-gray-600"
        title="Zoom In (+)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  )
}
