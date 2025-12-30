# OpenBoard

A self-hosted collaborative whiteboard for teachers. Create interactive whiteboards and share them with students in real-time.

> **Status: Work in Progress**
>
> The core whiteboard functionality is complete. We're currently building the automated onboarding system to make deployment effortless for non-technical users.

## Features

- **Real-time Collaboration** - Multiple users can view and interact with the same board
- **Drawing Tools** - Pen, marker, highlighter, shapes, text, and eraser
- **Teacher-Only Editing** - Only the board owner can draw; students view in read-only mode *(coming soon)*
- **Zero Configuration** - Deploy your own instance with 3 clicks *(coming soon)*
- **Self-Hosted** - Your data stays on your own infrastructure
- **Free & Open Source** - MIT licensed

## How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         Your Whiteboard                          │
│                                                                  │
│   Teacher (you)          ←→        Students                      │
│   - Creates boards                 - View boards (read-only)     │
│   - Draws & writes                 - See real-time updates       │
│   - Shares links                   - See teacher's cursor        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment (Coming Soon)

We're building a **3-click deployment system** that will:

1. **Connect your Vercel account** - Click to authorize
2. **Connect your Supabase account** - Click to authorize
3. **Click Deploy** - We automatically:
   - Create your database with all tables
   - Deploy your app
   - Configure everything

**No terminal. No environment variables. No technical knowledge required.**

### What You'll Get

| Service | Purpose | Cost |
|---------|---------|------|
| Vercel | Hosts your whiteboard app | Free tier |
| Supabase | Database + Authentication | Free tier |

**Total cost: $0** (within free tier limits)

### Architecture

```
Teacher's Browser  ←──→  Vercel (Your App)  ←──→  Supabase (Your Database)
       ↑
       └──── WebRTC (peer-to-peer) ────→ Student's Browser
             (Real-time sync via public signaling)
```

Each teacher gets their own:
- App URL: `your-name.vercel.app`
- Database: Stored in your Supabase account
- Real-time sync uses WebRTC (no server needed)

## Current Features

### Drawing Tools
- **Pen** - Freehand drawing
- **Marker** - Thick strokes
- **Highlighter** - Semi-transparent highlighting
- **Shapes** - Rectangle, circle, line, arrow
- **Text** - Click to add text
- **Eraser** - Remove objects
- **Select** - Move, resize, rotate objects

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| V | Select tool |
| P | Pen |
| M | Marker |
| H | Highlighter |
| R | Rectangle |
| O | Circle |
| L | Line |
| T | Text |
| E | Eraser |
| Space + Drag | Pan canvas |
| Scroll | Zoom |
| Cmd/Ctrl + Z | Undo |
| Cmd/Ctrl + Shift + Z | Redo |
| Delete | Remove selected |

### Export Options
- PNG image
- SVG vector
- JSON (backup/restore)

## Development

If you want to run locally for development:

```bash
# Clone the repo
git clone https://github.com/yourusername/openboard.git
cd openboard

# Install dependencies
npm install

# Start the WebSocket server (terminal 1)
npm run dev:ws

# Start the Next.js app (terminal 2)
npm run dev

# Open http://localhost:3000
```

## Roadmap

- [x] Core whiteboard with drawing tools
- [x] Real-time collaboration (Yjs + WebRTC)
- [x] Undo/Redo
- [x] Export (PNG, SVG, JSON, PDF)
- [x] Zoom & Pan
- [x] Teacher authentication (Supabase Auth)
- [x] Teacher-only editing permissions
- [x] Funky board IDs (e.g., `happy-penguin-42`)
- [x] Multi-page boards with thumbnails
- [x] Supabase storage with localStorage fallback
- [ ] **Automated onboarding wizard** *(in progress)*
- [ ] Mobile responsive toolbar

## Tech Stack

- **Frontend:** Next.js 14, React, TypeScript
- **Canvas:** Fabric.js v6
- **Styling:** Tailwind CSS
- **State:** Zustand
- **Real-time:** Yjs + WebRTC (y-webrtc)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Hosting:** Vercel

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

## License

MIT License - feel free to use this for your school, organization, or personal projects.

---

**Questions?** Open an issue on GitHub.
