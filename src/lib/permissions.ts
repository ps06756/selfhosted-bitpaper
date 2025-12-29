/**
 * Board Permissions System
 * Handles owner verification and edit permissions
 * Supports both Supabase auth (user ID) and localStorage fallback (session ID)
 */

const SESSION_KEY = 'openboard_session_id'
const BOARD_OWNERS_KEY = 'openboard_board_owners'

/**
 * Get or create a unique session ID for this browser (fallback when not logged in)
 */
export function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = localStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

/**
 * Get the stored owner data for all boards
 * Format: { boardId: { ownerId: string, ownerType: 'user' | 'session' } }
 */
interface BoardOwner {
  ownerId: string
  ownerType: 'user' | 'session'
}

function getBoardOwners(): Record<string, BoardOwner> {
  if (typeof window === 'undefined') return {}

  const data = localStorage.getItem(BOARD_OWNERS_KEY)
  if (!data) return {}

  // Handle migration from old format (just string IDs)
  const parsed = JSON.parse(data)
  const result: Record<string, BoardOwner> = {}

  for (const [boardId, value] of Object.entries(parsed)) {
    if (typeof value === 'string') {
      // Old format - treat as session
      result[boardId] = { ownerId: value, ownerType: 'session' }
    } else {
      result[boardId] = value as BoardOwner
    }
  }

  return result
}

/**
 * Save board owners to localStorage
 */
function saveBoardOwners(owners: Record<string, BoardOwner>): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(BOARD_OWNERS_KEY, JSON.stringify(owners))
}

/**
 * Set the owner of a board
 */
export function setBoardOwner(boardId: string, userId?: string): void {
  if (typeof window === 'undefined') return

  const owners = getBoardOwners()

  if (userId) {
    // Logged in user
    owners[boardId] = { ownerId: userId, ownerType: 'user' }
  } else {
    // Anonymous session
    owners[boardId] = { ownerId: getSessionId(), ownerType: 'session' }
  }

  saveBoardOwners(owners)
}

/**
 * Check if the current user owns a specific board
 */
export function isBoardOwner(boardId: string, userId?: string | null): boolean {
  if (typeof window === 'undefined') return false

  const owners = getBoardOwners()
  const boardOwner = owners[boardId]

  // If no owner is set, the first person to access becomes owner
  if (!boardOwner) {
    return true // Will be set when they make first edit
  }

  // Check if logged-in user is owner
  if (userId && boardOwner.ownerType === 'user') {
    return boardOwner.ownerId === userId
  }

  // Check if session is owner (for anonymous users)
  if (!userId && boardOwner.ownerType === 'session') {
    return boardOwner.ownerId === getSessionId()
  }

  // Logged in user can also access boards they created while anonymous
  // (if the session matches)
  if (userId && boardOwner.ownerType === 'session') {
    return boardOwner.ownerId === getSessionId()
  }

  return false
}

/**
 * Check if the URL indicates view-only mode
 */
export function isViewOnlyFromUrl(): boolean {
  if (typeof window === 'undefined') return false

  const params = new URLSearchParams(window.location.search)
  return params.get('view') === '1' || params.get('mode') === 'view'
}

/**
 * Get the edit permission for a board
 */
export function canEditBoard(boardId: string, userId?: string | null): boolean {
  // View-only mode from URL always means no editing
  if (isViewOnlyFromUrl()) {
    return false
  }

  // Otherwise, check if user is the owner
  return isBoardOwner(boardId, userId)
}

/**
 * Generate a view-only link for sharing
 */
export function getViewOnlyLink(boardId: string): string {
  if (typeof window === 'undefined') return ''

  const url = new URL(window.location.href)
  url.searchParams.set('view', '1')
  return url.toString()
}

/**
 * Generate an edit link (for the owner)
 */
export function getEditLink(boardId: string): string {
  if (typeof window === 'undefined') return ''

  const url = new URL(window.location.href)
  url.searchParams.delete('view')
  url.searchParams.delete('mode')
  return url.toString()
}

/**
 * Claim ownership of a board (for first-time creators)
 */
export function claimBoardOwnership(boardId: string, userId?: string | null): void {
  const owners = getBoardOwners()

  // Only claim if not already owned
  if (!owners[boardId]) {
    setBoardOwner(boardId, userId || undefined)
  }
}

/**
 * Transfer board ownership to a logged-in user (when they log in after creating anonymously)
 */
export function transferBoardOwnership(boardId: string, userId: string): void {
  const owners = getBoardOwners()
  const boardOwner = owners[boardId]

  // Only transfer if the current session owns the board
  if (boardOwner && boardOwner.ownerType === 'session' && boardOwner.ownerId === getSessionId()) {
    owners[boardId] = { ownerId: userId, ownerType: 'user' }
    saveBoardOwners(owners)
  }
}
