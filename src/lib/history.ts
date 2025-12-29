import { Canvas } from 'fabric'

const MAX_HISTORY_SIZE = 50

export class HistoryManager {
  private undoStack: string[] = []
  private redoStack: string[] = []
  private canvas: Canvas | null = null
  private isRestoring = false
  private onChange: (canUndo: boolean, canRedo: boolean) => void

  constructor(onChange: (canUndo: boolean, canRedo: boolean) => void) {
    this.onChange = onChange
  }

  init(canvas: Canvas) {
    this.canvas = canvas
    // Save initial state
    this.saveState()

    // Listen to canvas changes
    canvas.on('object:added', () => this.onCanvasChange())
    canvas.on('object:modified', () => this.onCanvasChange())
    canvas.on('object:removed', () => this.onCanvasChange())
  }

  private onCanvasChange() {
    if (this.isRestoring) return
    this.saveState()
  }

  saveState() {
    if (!this.canvas) return

    const json = JSON.stringify(this.canvas.toJSON())

    // Don't save if same as last state
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === json) {
      return
    }

    this.undoStack.push(json)

    // Clear redo stack on new action
    this.redoStack = []

    // Limit history size
    if (this.undoStack.length > MAX_HISTORY_SIZE) {
      this.undoStack.shift()
    }

    this.notifyChange()
  }

  undo() {
    if (!this.canvas || this.undoStack.length <= 1) return

    this.isRestoring = true

    // Move current state to redo stack
    const currentState = this.undoStack.pop()
    if (currentState) {
      this.redoStack.push(currentState)
    }

    // Restore previous state
    const previousState = this.undoStack[this.undoStack.length - 1]
    if (previousState) {
      this.canvas.loadFromJSON(previousState).then(() => {
        this.canvas?.renderAll()
        this.isRestoring = false
        this.notifyChange()
      })
    } else {
      this.isRestoring = false
    }
  }

  redo() {
    if (!this.canvas || this.redoStack.length === 0) return

    this.isRestoring = true

    const nextState = this.redoStack.pop()
    if (nextState) {
      this.undoStack.push(nextState)
      this.canvas.loadFromJSON(nextState).then(() => {
        this.canvas?.renderAll()
        this.isRestoring = false
        this.notifyChange()
      })
    } else {
      this.isRestoring = false
    }
  }

  private notifyChange() {
    this.onChange(this.undoStack.length > 1, this.redoStack.length > 0)
  }

  canUndo() {
    return this.undoStack.length > 1
  }

  canRedo() {
    return this.redoStack.length > 0
  }

  clear() {
    this.undoStack = []
    this.redoStack = []
    this.saveState()
  }
}
