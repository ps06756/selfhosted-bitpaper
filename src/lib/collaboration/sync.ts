import { Canvas, FabricObject } from 'fabric'
import { CollaborationProvider, UserAwareness } from './yjs-provider'
import { v4 as uuidv4 } from 'uuid'

export class CanvasSync {
  private canvas: Canvas
  private provider: CollaborationProvider
  private isSyncing = false
  private localObjectIds = new Set<string>()
  onUsersChange: ((users: UserAwareness[]) => void) | null = null

  constructor(canvas: Canvas, provider: CollaborationProvider) {
    this.canvas = canvas
    this.provider = provider

    this.setupCanvasListeners()
    this.setupProviderListeners()
  }

  private setupCanvasListeners() {
    // Object added
    this.canvas.on('object:added', (e) => {
      if (this.isSyncing || !e.target) return
      this.syncObjectToRemote(e.target)
    })

    // Object modified (moved, scaled, rotated)
    this.canvas.on('object:modified', (e) => {
      if (this.isSyncing || !e.target) return
      this.syncObjectToRemote(e.target)
    })

    // Object removed
    this.canvas.on('object:removed', (e) => {
      if (this.isSyncing || !e.target) return
      const id = this.getObjectId(e.target)
      if (id) {
        this.provider.removeObject(id)
        this.localObjectIds.delete(id)
      }
    })

    // Path created (for free drawing)
    this.canvas.on('path:created', (e: any) => {
      if (this.isSyncing || !e.path) return
      this.syncObjectToRemote(e.path)
    })

    // Mouse move for cursor tracking
    this.canvas.on('mouse:move', (e) => {
      if (e.e) {
        const pointer = this.canvas.getScenePoint(e.e)
        this.provider.updateCursor(pointer.x, pointer.y)
      }
    })

    // Mouse out - clear cursor
    this.canvas.on('mouse:out', () => {
      this.provider.clearCursor()
    })
  }

  private setupProviderListeners() {
    // Handle remote changes
    this.provider.onRemoteChange = (objects) => {
      this.applyRemoteChanges(objects)
    }

    // Handle awareness changes
    this.provider.onAwarenessChange = (users) => {
      if (this.onUsersChange) {
        this.onUsersChange(users)
      }
    }
  }

  private getObjectId(obj: FabricObject): string | null {
    // Check if object already has an ID
    const existingId = (obj as any).__syncId
    if (existingId) return existingId

    // Generate and assign new ID
    const newId = uuidv4()
    ;(obj as any).__syncId = newId
    this.localObjectIds.add(newId)
    return newId
  }

  private syncObjectToRemote(obj: FabricObject) {
    const id = this.getObjectId(obj)
    if (!id) return

    // Serialize the object
    const objectData = obj.toObject(['__syncId'])
    objectData.__syncId = id
    objectData.__type = obj.type

    this.provider.syncObject(id, objectData)
  }

  private applyRemoteChanges(objects: Map<string, any>) {
    this.isSyncing = true

    try {
      // Get current object IDs on canvas
      const currentIds = new Set<string>()
      this.canvas.getObjects().forEach((obj) => {
        const id = (obj as any).__syncId
        if (id) currentIds.add(id)
      })

      // Process remote objects
      objects.forEach((objectData, id) => {
        // Skip objects we created locally
        if (this.localObjectIds.has(id)) return

        const existingObj = this.findObjectById(id)

        if (existingObj) {
          // Update existing object
          this.updateObject(existingObj, objectData)
        } else {
          // Create new object from remote
          this.createObjectFromData(id, objectData)
        }
      })

      // Remove objects that were deleted remotely
      this.canvas.getObjects().forEach((obj) => {
        const id = (obj as any).__syncId
        if (id && !objects.has(id) && !this.localObjectIds.has(id)) {
          this.canvas.remove(obj)
        }
      })

      this.canvas.renderAll()
    } finally {
      this.isSyncing = false
    }
  }

  private findObjectById(id: string): FabricObject | null {
    const objects = this.canvas.getObjects()
    for (const obj of objects) {
      if ((obj as any).__syncId === id) {
        return obj
      }
    }
    return null
  }

  private updateObject(obj: FabricObject, data: any) {
    // Update object properties
    obj.set({
      left: data.left,
      top: data.top,
      scaleX: data.scaleX,
      scaleY: data.scaleY,
      angle: data.angle,
      fill: data.fill,
      stroke: data.stroke,
      strokeWidth: data.strokeWidth,
    })
    obj.setCoords()
  }

  private async createObjectFromData(id: string, data: any) {
    try {
      // Use Fabric's enlivenObjects to recreate the object
      const objects = await (this.canvas as any).constructor.util.enlivenObjects([data])

      if (objects && objects.length > 0) {
        const obj = objects[0]
        ;(obj as any).__syncId = id
        obj.selectable = true
        obj.evented = true
        this.canvas.add(obj)
      }
    } catch (error) {
      console.error('Failed to create object from remote data:', error)
    }
  }

  // Sync current canvas state to remote (called on initial connection)
  syncCurrentState() {
    const objects = new Map<string, any>()

    this.canvas.getObjects().forEach((obj) => {
      const id = this.getObjectId(obj)
      if (id) {
        const objectData = obj.toObject(['__syncId'])
        objectData.__syncId = id
        objectData.__type = obj.type
        objects.set(id, objectData)
      }
    })

    if (objects.size > 0) {
      this.provider.syncAllObjects(objects)
    }
  }

  // Load remote state to canvas (called on join)
  loadRemoteState() {
    const objects = this.provider.getAllObjects()
    if (objects.size > 0) {
      this.applyRemoteChanges(objects)
    }
  }

  destroy() {
    this.canvas.off('object:added')
    this.canvas.off('object:modified')
    this.canvas.off('object:removed')
    this.canvas.off('path:created')
    this.canvas.off('mouse:move')
    this.canvas.off('mouse:out')
  }
}
