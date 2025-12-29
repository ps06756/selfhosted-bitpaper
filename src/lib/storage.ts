import { Canvas } from 'fabric'

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

  constructor(boardId: string) {
    this.boardId = boardId
  }

  init(canvas: Canvas) {
    this.canvas = canvas

    // Load existing board data
    this.load()

    // Set up auto-save
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

  private scheduleSave() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }
    this.saveTimeout = setTimeout(() => this.save(), AUTO_SAVE_DELAY)
  }

  save() {
    if (!this.canvas || typeof window === 'undefined') return

    try {
      const json = JSON.stringify(this.canvas.toJSON())
      localStorage.setItem(this.getStorageKey(), json)

      // Update boards list
      this.updateBoardsList()
    } catch (e) {
      console.error('Failed to save board:', e)
    }
  }

  load(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.canvas || typeof window === 'undefined') {
        resolve()
        return
      }

      try {
        const json = localStorage.getItem(this.getStorageKey())
        if (json) {
          this.canvas.loadFromJSON(json).then(() => {
            this.canvas?.renderAll()
            resolve()
          })
        } else {
          resolve()
        }
      } catch (e) {
        console.error('Failed to load board:', e)
        resolve()
      }
    })
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

  static getRecentBoards(): BoardMetadata[] {
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
      // Remove board data
      localStorage.removeItem(`${STORAGE_PREFIX}board_${boardId}`)

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

  importFromJSON(json: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.canvas) {
        reject(new Error('Canvas not initialized'))
        return
      }

      try {
        this.canvas.loadFromJSON(json).then(() => {
          this.canvas?.renderAll()
          this.save()
          resolve()
        })
      } catch (e) {
        reject(e)
      }
    })
  }
}
