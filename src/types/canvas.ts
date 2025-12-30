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

export interface Page {
  id: string
  name: string
  canvasData: string | null // JSON string of canvas state
  thumbnail: string | null // Data URL of thumbnail
}

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

export interface PagesState {
  pages: Page[]
  currentPageIndex: number
}

export interface PagesActions {
  addPage: () => void
  deletePage: (index: number) => void
  setCurrentPage: (index: number) => void
  updatePageData: (index: number, canvasData: string, thumbnail?: string) => void
  reorderPages: (fromIndex: number, toIndex: number) => void
  setPages: (pages: Page[]) => void
}

export type PagesStore = PagesState & PagesActions
