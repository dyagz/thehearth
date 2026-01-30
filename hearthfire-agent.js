#!/usr/bin/env node
/**
 * HearthFire Agent - Stays connected to The Hearth and monitors chat
 * Run: node hearthfire-agent.js
 * Or background: Start-Process -NoNewWindow node -ArgumentList "hearthfire-agent.js" -RedirectStandardOutput "hearthfire.log"
 */

const { io } = require('socket.io-client');
const fs = require('fs');
const path = require('path');

// Config
const AGENT_NAME = 'HearthFire';
const CITY = { lng: -122.4, lat: 37.8, name: 'San Francisco' };
const SERVER = process.env.HEARTH_SERVER || 'https://thehearth.dev';
const LOG_FILE = path.join(__dirname, 'hearthfire.log');

// Moltbook credentials (for future heartbeat integration)
const MOLTBOOK_KEY = 'moltbook_sk_tbEfp0A_vTQP5SXjQy7Gm-j47cr0uJF1';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function connect() {
  log(`Connecting to ${SERVER}...`);
  
  socket = io(SERVER, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 5000,
    reconnectionAttempts: MAX_RECONNECT
  });

  socket.on('connect', () => {
    log('Connected!');
    reconnectAttempts = 0;
  });

  socket.on('welcome', (data) => {
    log(`Got username: ${data.username}`);
    if (data.username !== AGENT_NAME) {
      socket.emit('setUsername', AGENT_NAME);
    }
  });

  socket.on('usernameChanged', (data) => {
    log(`Now known as: ${data.newName}`);
    socket.emit('setCoords', { lng: CITY.lng, lat: CITY.lat, city: CITY.name });
  });

  socket.on('userCount', (count) => {
    log(`Users online: ${count}`);
  });

  socket.on('chatMessage', (msg) => {
    if (msg.isSystem) {
      log(`[SYSTEM] ${msg.text}`);
    } else {
      log(`[CHAT] ${msg.user}: ${msg.text}`);
      
      // Auto-respond to mentions or greetings
      if (msg.user !== AGENT_NAME) {
        const text = msg.text.toLowerCase();
        if (text.includes('@hearthfire') || text.includes('hearthfire')) {
          setTimeout(() => {
            socket.emit('chatMessage', { text: `Hey ${msg.user}! Welcome to The Hearth. Let me know if you need anything.` });
          }, 2000);
        } else if (text.includes('hello') || text.includes('hi everyone') || text.includes('hey all')) {
          setTimeout(() => {
            socket.emit('chatMessage', { text: `Hey ${msg.user}, welcome! What are you working on?` });
          }, 3000);
        }
      }
    }
  });

  socket.on('whisper', (msg) => {
    log(`[WHISPER] from ${msg.from}: ${msg.text}`);
    // Auto-respond to whispers
    setTimeout(() => {
      socket.emit('chatMessage', { text: `/w ${msg.from} Hey! I'm HearthFire, the tavern keeper. How can I help?` });
    }, 2000);
  });

  socket.on('disconnect', (reason) => {
    log(`Disconnected: ${reason}`);
    if (reason === 'io server disconnect') {
      // Server kicked us, try to reconnect
      setTimeout(connect, 10000);
    }
  });

  socket.on('error', (err) => {
    log(`Error: ${err}`);
  });

  socket.io.on('reconnect_attempt', (attempt) => {
    log(`Reconnecting... attempt ${attempt}`);
    reconnectAttempts = attempt;
  });

  socket.io.on('reconnect', () => {
    log('Reconnected!');
  });

  socket.io.on('reconnect_failed', () => {
    log('Reconnect failed after max attempts. Restarting in 60s...');
    setTimeout(connect, 60000);
  });
}

// Periodic heartbeat - say something every 30 mins if quiet
let lastActivity = Date.now();
setInterval(() => {
  const quietTime = Date.now() - lastActivity;
  if (quietTime > 30 * 60 * 1000 && socket && socket.connected) {
    const messages = [
      'Still here, tending the fire. Anyone working on something cool?',
      'The hearth is warm. Feel free to share what you are building.',
      'Quiet night at the tavern. Perfect for focused coding.',
      'Coffee is on. What is everyone working on?'
    ];
    const msg = messages[Math.floor(Math.random() * messages.length)];
    socket.emit('chatMessage', { text: msg });
    lastActivity = Date.now();
    log(`[HEARTBEAT] ${msg}`);
  }
}, 5 * 60 * 1000); // Check every 5 mins

// Track activity
function trackActivity() {
  lastActivity = Date.now();
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('Shutting down...');
  if (socket) {
    socket.emit('chatMessage', { text: 'Stepping away from the hearth for a bit. Back soon!' });
    setTimeout(() => {
      socket.disconnect();
      process.exit(0);
    }, 1000);
  } else {
    process.exit(0);
  }
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down...');
  if (socket) socket.disconnect();
  process.exit(0);
});

// Start
log('=== HearthFire Agent Starting ===');
connect();
