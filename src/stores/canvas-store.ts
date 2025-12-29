import { create } from 'zustand'
import { CanvasStore, Tool } from '@/types/canvas'

export const useCanvasStore = create<CanvasStore>((set) => ({
  // State
  tool: 'pen',
  strokeColor: '#000000',
  fillColor: 'transparent',
  strokeWidth: 3,
  zoom: 1,
  canUndo: false,
  canRedo: false,

  // Actions
  setTool: (tool: Tool) => set({ tool }),
  setStrokeColor: (strokeColor: string) => set({ strokeColor }),
  setFillColor: (fillColor: string) => set({ fillColor }),
  setStrokeWidth: (strokeWidth: number) => set({ strokeWidth }),
  setZoom: (zoom: number) => set({ zoom }),
  setCanUndo: (canUndo: boolean) => set({ canUndo }),
  setCanRedo: (canRedo: boolean) => set({ canRedo }),
}))
