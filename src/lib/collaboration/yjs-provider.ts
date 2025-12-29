import * as Y from 'yjs'
import { WebrtcProvider } from 'y-webrtc'

export interface UserAwareness {
  id: string
  name: string
  color: string
  cursor: { x: number; y: number } | null
}

const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'
]

const NAMES = [
  'Anonymous Penguin', 'Curious Cat', 'Happy Hedgehog',
  'Clever Fox', 'Wise Owl', 'Swift Rabbit', 'Brave Bear', 'Kind Koala'
]

export class CollaborationProvider {
  doc: Y.Doc
  provider: WebrtcProvider | null = null
  canvasObjects: Y.Map<any>
  awareness: any
  userId: string
  userName: string
  userColor: string
  onRemoteChange: ((objects: Map<string, any>) => void) | null = null
  onAwarenessChange: ((users: UserAwareness[]) => void) | null = null

  constructor(roomId: string) {
    this.doc = new Y.Doc()
    this.canvasObjects = this.doc.getMap('canvasObjects')

    // Generate random user identity
    this.userId = Math.random().toString(36).substring(2, 9)
    this.userName = NAMES[Math.floor(Math.random() * NAMES.length)]
    this.userColor = COLORS[Math.floor(Math.random() * COLORS.length)]

    // Only create provider on client side
    if (typeof window !== 'undefined') {
      this.initProvider(roomId)
    }
  }

  private initProvider(roomId: string) {
    // Use public signaling servers
    this.provider = new WebrtcProvider(`openboard-${roomId}`, this.doc, {
      signaling: [
        'wss://signaling.yjs.dev',
        'wss://y-webrtc-signaling-eu.herokuapp.com',
        'wss://y-webrtc-signaling-us.herokuapp.com',
      ],
    })

    this.awareness = this.provider.awareness

    // Set local user state
    this.awareness.setLocalState({
      id: this.userId,
      name: this.userName,
      color: this.userColor,
      cursor: null,
    })

    // Listen for awareness changes (other users)
    this.awareness.on('change', () => {
      this.handleAwarenessChange()
    })

    // Listen for remote changes to canvas objects
    this.canvasObjects.observe((event) => {
      if (event.transaction.local) return // Ignore local changes
      this.handleRemoteChange()
    })
  }

  private handleAwarenessChange() {
    if (!this.awareness || !this.onAwarenessChange) return

    const users: UserAwareness[] = []
    this.awareness.getStates().forEach((state: any, clientId: number) => {
      if (state && clientId !== this.awareness.clientID) {
        users.push({
          id: state.id || String(clientId),
          name: state.name || 'Anonymous',
          color: state.color || '#888888',
          cursor: state.cursor,
        })
      }
    })

    this.onAwarenessChange(users)
  }

  private handleRemoteChange() {
    if (!this.onRemoteChange) return

    const objects = new Map<string, any>()
    this.canvasObjects.forEach((value, key) => {
      objects.set(key, value)
    })

    this.onRemoteChange(objects)
  }

  // Update local cursor position
  updateCursor(x: number, y: number) {
    if (!this.awareness) return

    const currentState = this.awareness.getLocalState() || {}
    this.awareness.setLocalState({
      ...currentState,
      cursor: { x, y },
    })
  }

  // Clear cursor when mouse leaves canvas
  clearCursor() {
    if (!this.awareness) return

    const currentState = this.awareness.getLocalState() || {}
    this.awareness.setLocalState({
      ...currentState,
      cursor: null,
    })
  }

  // Sync a single object to Yjs
  syncObject(id: string, objectData: any) {
    this.doc.transact(() => {
      this.canvasObjects.set(id, objectData)
    })
  }

  // Remove an object from Yjs
  removeObject(id: string) {
    this.doc.transact(() => {
      this.canvasObjects.delete(id)
    })
  }

  // Sync all objects (used on initial load)
  syncAllObjects(objects: Map<string, any>) {
    this.doc.transact(() => {
      // Clear existing
      this.canvasObjects.clear()
      // Add all current objects
      objects.forEach((value, key) => {
        this.canvasObjects.set(key, value)
      })
    })
  }

  // Get all objects from Yjs
  getAllObjects(): Map<string, any> {
    const objects = new Map<string, any>()
    this.canvasObjects.forEach((value, key) => {
      objects.set(key, value)
    })
    return objects
  }

  // Get connection status
  isConnected(): boolean {
    return this.provider?.connected ?? false
  }

  // Get number of connected peers
  getPeerCount(): number {
    if (!this.awareness) return 0
    return this.awareness.getStates().size - 1 // Exclude self
  }

  destroy() {
    this.provider?.destroy()
    this.doc.destroy()
  }
}
