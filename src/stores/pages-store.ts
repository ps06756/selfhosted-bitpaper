import { create } from 'zustand'
import { Page, PagesStore } from '@/types/canvas'

function generatePageId(): string {
  return `page-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function createDefaultPage(index: number): Page {
  return {
    id: generatePageId(),
    name: `Page ${index + 1}`,
    canvasData: null,
    thumbnail: null,
  }
}

export const usePagesStore = create<PagesStore>((set, get) => ({
  // State
  pages: [createDefaultPage(0)],
  currentPageIndex: 0,

  // Actions
  addPage: () => {
    const { pages } = get()
    const newPage = createDefaultPage(pages.length)
    set({
      pages: [...pages, newPage],
      currentPageIndex: pages.length,
    })
  },

  deletePage: (index: number) => {
    const { pages, currentPageIndex } = get()

    // Don't delete if it's the only page
    if (pages.length <= 1) return

    const newPages = pages.filter((_, i) => i !== index)
    let newCurrentIndex = currentPageIndex

    // Adjust current page index if needed
    if (index < currentPageIndex) {
      newCurrentIndex = currentPageIndex - 1
    } else if (index === currentPageIndex) {
      newCurrentIndex = Math.min(index, newPages.length - 1)
    }

    set({
      pages: newPages,
      currentPageIndex: newCurrentIndex,
    })
  },

  setCurrentPage: (index: number) => {
    const { pages } = get()
    if (index >= 0 && index < pages.length) {
      set({ currentPageIndex: index })
    }
  },

  updatePageData: (index: number, canvasData: string, thumbnail?: string) => {
    const { pages } = get()
    if (index >= 0 && index < pages.length) {
      const newPages = [...pages]
      newPages[index] = {
        ...newPages[index],
        canvasData,
        ...(thumbnail && { thumbnail }),
      }
      set({ pages: newPages })
    }
  },

  reorderPages: (fromIndex: number, toIndex: number) => {
    const { pages, currentPageIndex } = get()
    if (fromIndex < 0 || fromIndex >= pages.length) return
    if (toIndex < 0 || toIndex >= pages.length) return

    const newPages = [...pages]
    const [removed] = newPages.splice(fromIndex, 1)
    newPages.splice(toIndex, 0, removed)

    // Adjust current page index
    let newCurrentIndex = currentPageIndex
    if (currentPageIndex === fromIndex) {
      newCurrentIndex = toIndex
    } else if (fromIndex < currentPageIndex && toIndex >= currentPageIndex) {
      newCurrentIndex = currentPageIndex - 1
    } else if (fromIndex > currentPageIndex && toIndex <= currentPageIndex) {
      newCurrentIndex = currentPageIndex + 1
    }

    set({
      pages: newPages,
      currentPageIndex: newCurrentIndex,
    })
  },

  setPages: (pages: Page[]) => {
    set({
      pages: pages.length > 0 ? pages : [createDefaultPage(0)],
      currentPageIndex: 0,
    })
  },
}))
