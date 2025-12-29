#!/usr/bin/env node

const WebSocket = require('ws')
const http = require('http')

const port = process.env.WS_PORT || 1234

// Store documents by room name
const docs = new Map()
// Store awareness states by room
const awarenessStates = new Map()

const server = http.createServer((request, response) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('OpenBoard WebSocket Server\n')
})

const wss = new WebSocket.Server({ server })

// Get or create room
function getRoom(roomName) {
  if (!docs.has(roomName)) {
    docs.set(roomName, {
      clients: new Set(),
      updates: []
    })
    awarenessStates.set(roomName, new Map())
  }
  return docs.get(roomName)
}

wss.on('connection', (ws, req) => {
  // Extract room name from URL path
  const roomName = req.url?.slice(1) || 'default'
  const room = getRoom(roomName)

  room.clients.add(ws)
  console.log(`Client connected to room: ${roomName} (${room.clients.size} clients)`)

  // Send existing document state to new client
  if (room.updates.length > 0) {
    // Send sync step 1 - request sync
    const syncMessage = Buffer.from([0, 0]) // messageSync, syncStep1
    ws.send(syncMessage)

    // Send all stored updates
    room.updates.forEach(update => {
      ws.send(update)
    })
  }

  ws.on('message', (message) => {
    const data = Buffer.from(message)
    const messageType = data[0]

    // messageSync = 0, messageAwareness = 1
    if (messageType === 0) {
      // Sync message - store and broadcast
      room.updates.push(data)

      // Broadcast to all other clients in room
      room.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(data)
        }
      })
    } else if (messageType === 1) {
      // Awareness message - broadcast to all other clients
      room.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(data)
        }
      })
    }
  })

  ws.on('close', () => {
    room.clients.delete(ws)
    console.log(`Client disconnected from room: ${roomName} (${room.clients.size} clients)`)

    // Clean up empty rooms after a delay
    if (room.clients.size === 0) {
      setTimeout(() => {
        if (room.clients.size === 0) {
          docs.delete(roomName)
          awarenessStates.delete(roomName)
          console.log(`Room ${roomName} cleaned up`)
        }
      }, 30000) // 30 seconds
    }
  })

  ws.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
})

server.listen(port, () => {
  console.log(`WebSocket server running on ws://localhost:${port}`)
})
