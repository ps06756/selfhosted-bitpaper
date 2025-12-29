export type Tool =
  | 'select'
  | 'pen'
  | 'marker'
  | 'highlighter'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'text'

export interface CanvasState {
  tool: Tool
  strokeColor: string
  fillColor: string
  strokeWidth: number
  zoom: number
  canUndo: boolean
  canRedo: boolean
}

export interface CanvasActions {
  setTool: (tool: Tool) => void
  setStrokeColor: (color: string) => void
  setFillColor: (color: string) => void
  setStrokeWidth: (width: number) => void
  setZoom: (zoom: number) => void
  setCanUndo: (canUndo: boolean) => void
  setCanRedo: (canRedo: boolean) => void
}

export type CanvasStore = CanvasState & CanvasActions
