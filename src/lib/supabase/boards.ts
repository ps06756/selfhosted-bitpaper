import { createClient, isSupabaseConfigured } from './client'
import { Page } from '@/types/canvas'

export interface BoardRecord {
  id: string
  owner_id: string | null
  owner_session: string | null
  name: string | null
  created_at: string
  updated_at: string
}

export interface PageRecord {
  id: string
  board_id: string
  page_index: number
  name: string | null
  canvas_data: string | null
  thumbnail: string | null
  created_at: string
  updated_at: string
}

// Get or create session ID for anonymous users
function getSessionId(): string {
  if (typeof window === 'undefined') return ''

  let sessionId = localStorage.getItem('openboard_session_id')
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('openboard_session_id', sessionId)
  }
  return sessionId
}

// Board operations
export async function getBoard(boardId: string): Promise<BoardRecord | null> {
  const supabase = createClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('boards')
    .select('*')
    .eq('id', boardId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    console.error('Error fetching board:', error)
    return null
  }

  return data
}

export async function createBoard(boardId: string, userId?: string | null): Promise<BoardRecord | null> {
  const supabase = createClient()
  if (!supabase) return null

  const sessionId = getSessionId()

  const { data, error } = await supabase
    .from('boards')
    .insert({
      id: boardId,
      owner_id: userId || null,
      owner_session: userId ? null : sessionId,
      name: `Board ${boardId}`,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating board:', error)
    return null
  }

  return data
}

export async function updateBoard(boardId: string, updates: Partial<BoardRecord>): Promise<boolean> {
  const supabase = createClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('boards')
    .update(updates)
    .eq('id', boardId)

  if (error) {
    console.error('Error updating board:', error)
    return false
  }

  return true
}

export async function getOrCreateBoard(boardId: string, userId?: string | null): Promise<BoardRecord | null> {
  let board = await getBoard(boardId)

  if (!board) {
    board = await createBoard(boardId, userId)
  }

  return board
}

// Page operations
export async function getPages(boardId: string): Promise<Page[]> {
  const supabase = createClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .eq('board_id', boardId)
    .order('page_index', { ascending: true })

  if (error) {
    console.error('Error fetching pages:', error)
    return []
  }

  return (data || []).map(pageRecordToPage)
}

export async function savePage(boardId: string, page: Page, pageIndex: number): Promise<boolean> {
  const supabase = createClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('pages')
    .upsert({
      id: page.id,
      board_id: boardId,
      page_index: pageIndex,
      name: page.name,
      canvas_data: page.canvasData,
      thumbnail: page.thumbnail,
    })

  if (error) {
    console.error('Error saving page:', error)
    return false
  }

  return true
}

export async function saveAllPages(boardId: string, pages: Page[]): Promise<boolean> {
  const supabase = createClient()
  if (!supabase) return false

  // Delete existing pages and insert new ones
  const { error: deleteError } = await supabase
    .from('pages')
    .delete()
    .eq('board_id', boardId)

  if (deleteError) {
    console.error('Error deleting old pages:', deleteError)
    return false
  }

  if (pages.length === 0) return true

  const pageRecords = pages.map((page, index) => ({
    id: page.id,
    board_id: boardId,
    page_index: index,
    name: page.name,
    canvas_data: page.canvasData,
    thumbnail: page.thumbnail,
  }))

  const { error: insertError } = await supabase
    .from('pages')
    .insert(pageRecords)

  if (insertError) {
    console.error('Error inserting pages:', insertError)
    return false
  }

  return true
}

export async function deletePage(boardId: string, pageId: string): Promise<boolean> {
  const supabase = createClient()
  if (!supabase) return false

  const { error } = await supabase
    .from('pages')
    .delete()
    .eq('id', pageId)
    .eq('board_id', boardId)

  if (error) {
    console.error('Error deleting page:', error)
    return false
  }

  return true
}

// Helper to convert database record to Page type
function pageRecordToPage(record: PageRecord): Page {
  return {
    id: record.id,
    name: record.name || `Page ${record.page_index + 1}`,
    canvasData: record.canvas_data,
    thumbnail: record.thumbnail,
  }
}

// Check if user can edit a board
export async function canEditBoard(boardId: string, userId?: string | null): Promise<boolean> {
  const board = await getBoard(boardId)

  if (!board) {
    // Board doesn't exist, anyone can create/edit it
    return true
  }

  // Check if user is the owner
  if (userId && board.owner_id === userId) {
    return true
  }

  // Check if session matches for anonymous boards
  if (!board.owner_id && board.owner_session) {
    const sessionId = getSessionId()
    return board.owner_session === sessionId
  }

  // No owner set, allow editing
  if (!board.owner_id && !board.owner_session) {
    return true
  }

  return false
}

// Get recent boards for current user/session
export async function getRecentBoards(userId?: string | null): Promise<BoardRecord[]> {
  const supabase = createClient()
  if (!supabase) return []

  const sessionId = getSessionId()

  let query = supabase
    .from('boards')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(20)

  if (userId) {
    query = query.eq('owner_id', userId)
  } else {
    query = query.eq('owner_session', sessionId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching recent boards:', error)
    return []
  }

  return data || []
}

// Export for checking if Supabase is available
export { isSupabaseConfigured }
