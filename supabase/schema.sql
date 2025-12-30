-- OpenBoard Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Boards table
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,  -- funky-id like "happy-penguin-42"
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_session TEXT,  -- for anonymous users
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pages table
CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,  -- page-{timestamp}-{random}
  board_id TEXT REFERENCES boards(id) ON DELETE CASCADE,
  page_index INTEGER NOT NULL,
  name TEXT,
  canvas_data TEXT,  -- JSON string of canvas state
  thumbnail TEXT,    -- Data URL of thumbnail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster page lookups
CREATE INDEX IF NOT EXISTS pages_board_id_idx ON pages(board_id);
CREATE INDEX IF NOT EXISTS pages_board_index_idx ON pages(board_id, page_index);

-- Enable Row Level Security
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Boards policies
-- Anyone can read boards (for viewers)
CREATE POLICY "Public read access for boards" ON boards
  FOR SELECT USING (true);

-- Owner can insert/update/delete their boards
CREATE POLICY "Owner can insert boards" ON boards
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id OR
    owner_id IS NULL
  );

CREATE POLICY "Owner can update boards" ON boards
  FOR UPDATE USING (
    auth.uid() = owner_id OR
    (owner_id IS NULL AND owner_session IS NOT NULL)
  );

CREATE POLICY "Owner can delete boards" ON boards
  FOR DELETE USING (
    auth.uid() = owner_id OR
    (owner_id IS NULL AND owner_session IS NOT NULL)
  );

-- Pages policies
-- Anyone can read pages (for viewers)
CREATE POLICY "Public read access for pages" ON pages
  FOR SELECT USING (true);

-- Board owner can manage pages
CREATE POLICY "Board owner can insert pages" ON pages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = pages.board_id
      AND (boards.owner_id = auth.uid() OR boards.owner_id IS NULL)
    )
  );

CREATE POLICY "Board owner can update pages" ON pages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = pages.board_id
      AND (boards.owner_id = auth.uid() OR boards.owner_id IS NULL)
    )
  );

CREATE POLICY "Board owner can delete pages" ON pages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM boards
      WHERE boards.id = pages.board_id
      AND (boards.owner_id = auth.uid() OR boards.owner_id IS NULL)
    )
  );

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_boards_updated_at ON boards;
CREATE TRIGGER update_boards_updated_at
  BEFORE UPDATE ON boards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pages_updated_at ON pages;
CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
