# NOTES - Agent Scratchpad

> Working memory and observations. The agent updates this as it works.

## Codebase Patterns
<!-- Reusable patterns discovered - READ THIS FIRST each iteration -->

### Socket.IO Client Pattern
- Connects to socket.io server with auth: `{ cachedUsername, cachedCoords }`
- Events: `welcome`, `chatHistory`, `chatMessage`, `whisper`, `userCount`, `liveUsers`, `onlineUsers`, `error`, `disconnect`
- Send events: `chatMessage`, `setLocation`
- Message format: `{ id, user, text, location, timestamp, verified?, isWhisper?, replyTo? }`
- Whisper command: `/w username message` - handled server-side

### Username Generation
- Pattern: `adjective_noun##` (e.g., `swift_coder42`)
- Server validates cached usernames against allowed word lists

### Security Features
- Rate limiting: 5 messages per 10 seconds
- Message sanitization via DOMPurify (strips HTML)
- Origin validation for WebSocket connections
- Max message length: 500 characters

## Current Observations
- Package.json has socket.io-client already installed
- Server runs on port 3000 (or env.PORT)
- Production server: thehearth.dev
- Chat history persisted to disk
- Discord OAuth authentication available

## Questions / Blockers

---
*Initialized: 2026-01-22 22:07:46*
