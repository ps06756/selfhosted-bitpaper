import { Canvas } from 'fabric'
import { Page } from '@/types/canvas'
import * as SupabaseBoards from '@/lib/supabase/boards'

const STORAGE_PREFIX = 'openboard_'
const BOARDS_LIST_KEY = 'openboard_boards'
const AUTO_SAVE_DELAY = 2000

export interface BoardMetadata {
  id: string
  name: string
  lastModified: number
  createdAt: number
}

export class StorageManager {
  private canvas: Canvas | null = null
  private boardId: string
  private saveTimeout: NodeJS.Timeout | null = null
  private useSupabase: boolean = false
  private userId: string | null = null

  constructor(boardId: string, userId?: string | null) {
    this.boardId = boardId
    this.userId = userId || null
    this.useSupabase = SupabaseBoards.isSupabaseConfigured()
  }

  init(canvas: Canvas) {
    this.canvas = canvas

    // Set up auto-save for canvas changes
    canvas.on('object:added', () => this.scheduleSave())
    canvas.on('object:modified', () => this.scheduleSave())
    canvas.on('object:removed', () => this.scheduleSave())

    // Save on window unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.save())
    }
  }

  private getStorageKey() {
    return `${STORAGE_PREFIX}board_${this.boardId}`
  }

  private getPagesStorageKey() {
    return `${STORAGE_PREFIX}pages_${this.boardId}`
  }

  private scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
    this.saveTimeout = setTimeout(() => this.save(), AUTO_SAVE_DELAY)
  }

  // Save current canvas state (called by auto-save)
  save() {
    if (!this.canvas || typeof window === 'undefined') return

    try {
      const json = JSON.stringify(this.canvas.toJSON())
      localStorage.setItem(this.getStorageKey(), json)
      this.updateBoardsList()
    } catch (e) {
      console.error('Failed to save board:', e)
    }
  }

  // Load canvas state from storage
  async load(): Promise<void> {
    if (!this.canvas || typeof window === 'undefined') return

    try {
      // Try localStorage first (faster)
      const json = localStorage.getItem(this.getStorageKey())
      if (json) {
        await this.canvas.loadFromJSON(json)
        this.canvas.renderAll()
      }
    } catch (e) {
      console.error('Failed to load board:', e)
    }
  }

  // Load all pages for this board
  async loadPages(): Promise<Page[]> {
    if (typeof window === 'undefined') return []

    // Try Supabase first
    if (this.useSupabase) {
      const pages = await SupabaseBoards.getPages(this.boardId)
      if (pages.length > 0) {
        // Cache to localStorage
        this.savePagesToLocalStorage(pages)
        return pages
      }
    }

    // Fall back to localStorage
    return this.loadPagesFromLocalStorage()
  }

  // Save all pages
  async savePages(pages: Page[]): Promise<boolean> {
    if (typeof window === 'undefined') return false

    // Always save to localStorage as backup
    this.savePagesToLocalStorage(pages)

    // Save to Supabase if configured
    if (this.useSupabase) {
      // Ensure board exists
      await SupabaseBoards.getOrCreateBoard(this.boardId, this.userId)
      return await SupabaseBoards.saveAllPages(this.boardId, pages)
    }

    return true
  }

  // Save a single page
  async savePage(page: Page, pageIndex: number): Promise<boolean> {
    if (typeof window === 'undefined') return false

    // Save to Supabase if configured
    if (this.useSupabase) {
      await SupabaseBoards.getOrCreateBoard(this.boardId, this.userId)
      return await SupabaseBoards.savePage(this.boardId, page, pageIndex)
    }

    // localStorage handled by savePages batch
    return true
  }

  private loadPagesFromLocalStorage(): Page[] {
    try {
      const json = localStorage.getItem(this.getPagesStorageKey())
      if (json) {
        return JSON.parse(json)
      }
    } catch (e) {
      console.error('Failed to load pages from localStorage:', e)
    }
    return []
  }

  private savePagesToLocalStorage(pages: Page[]) {
    try {
      localStorage.setItem(this.getPagesStorageKey(), JSON.stringify(pages))
    } catch (e) {
      console.error('Failed to save pages to localStorage:', e)
    }
  }

  private updateBoardsList() {
    if (typeof window === 'undefined') return

    try {
      const boardsJson = localStorage.getItem(BOARDS_LIST_KEY)
      const boards: BoardMetadata[] = boardsJson ? JSON.parse(boardsJson) : []

      const existingIndex = boards.findIndex((b) => b.id === this.boardId)
      const now = Date.now()

      if (existingIndex >= 0) {
        boards[existingIndex].lastModified = now
      } else {
        boards.push({
          id: this.boardId,
          name: `Board ${this.boardId}`,
          lastModified: now,
          createdAt: now,
        })
      }

      // Sort by last modified
      boards.sort((a, b) => b.lastModified - a.lastModified)

      // Keep only last 20 boards in the list
      const trimmedBoards = boards.slice(0, 20)

      localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(trimmedBoards))
    } catch (e) {
      console.error('Failed to update boards list:', e)
    }
  }

  // Check if current user can edit the board
  async canEdit(): Promise<boolean> {
    if (this.useSupabase) {
      return await SupabaseBoards.canEditBoard(this.boardId, this.userId)
    }
    // Without Supabase, use local permissions
    return true
  }

  static async getRecentBoards(userId?: string | null): Promise<BoardMetadata[]> {
    // Try Supabase first
    if (SupabaseBoards.isSupabaseConfigured()) {
      const boards = await SupabaseBoards.getRecentBoards(userId)
      return boards.map((b) => ({
        id: b.id,
        name: b.name || `Board ${b.id}`,
        lastModified: new Date(b.updated_at).getTime(),
        createdAt: new Date(b.created_at).getTime(),
      }))
    }

    // Fall back to localStorage
    if (typeof window === 'undefined') return []

    try {
      const boardsJson = localStorage.getItem(BOARDS_LIST_KEY)
      return boardsJson ? JSON.parse(boardsJson) : []
    } catch (e) {
      console.error('Failed to get recent boards:', e)
      return []
    }
  }

  static deleteBoard(boardId: string) {
    if (typeof window === 'undefined') return

    try {
      // Remove board data from localStorage
      localStorage.removeItem(`${STORAGE_PREFIX}board_${boardId}`)
      localStorage.removeItem(`${STORAGE_PREFIX}pages_${boardId}`)

      // Update boards list
      const boardsJson = localStorage.getItem(BOARDS_LIST_KEY)
      if (boardsJson) {
        const boards: BoardMetadata[] = JSON.parse(boardsJson)
        const filtered = boards.filter((b) => b.id !== boardId)
        localStorage.setItem(BOARDS_LIST_KEY, JSON.stringify(filtered))
      }
    } catch (e) {
      console.error('Failed to delete board:', e)
    }
  }

  exportAsJSON(): string {
    if (!this.canvas) return '{}'
    return JSON.stringify(this.canvas.toJSON(), null, 2)
  }

  async importFromJSON(json: string): Promise<void> {
    if (!this.canvas) {
      throw new Error('Canvas not initialized')
    }

    await this.canvas.loadFromJSON(json)
    this.canvas.renderAll()
    this.save()
  }
}
