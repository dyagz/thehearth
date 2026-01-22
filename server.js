import { createServer } from 'http';
import { Server } from 'socket.io';
import { handler } from './build/handler.js';
import express from 'express';
import DOMPurify from 'isomorphic-dompurify';

const app = express();
const server = createServer(app);

// Parse and validate allowed origins
function parseAllowedOrigins(env) {
	if (!env) {
		return ['http://localhost:5173', 'https://thehearth.dev'];
	}
	
	const origins = env.split(',')
		.map(o => o.trim())
		.filter(o => o && o !== '*') // Reject wildcard and empty strings
		.filter(o => {
			try {
				const url = new URL(o);
				return url.protocol === 'http:' || url.protocol === 'https:';
			} catch {
				console.error(`Invalid origin in ALLOWED_ORIGINS: ${o}`);
				return false;
			}
		});
	
	return origins.length > 0 ? origins : ['http://localhost:5173', 'https://thehearth.dev'];
}

const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
console.log('Allowed origins:', allowedOrigins);

// Socket.io setup with CORS and security limits
const io = new Server(server, {
	cors: {
		origin: allowedOrigins,
		methods: ['GET', 'POST'],
		credentials: true
	},
	maxHttpBufferSize: 1e6,  // 1MB max message size
	pingTimeout: 20000,
	pingInterval: 25000,
	connectTimeout: 10000
});

// Random username generator (adjective + noun)
const adjectives = [
	'swift', 'quiet', 'bold', 'clever', 'witty', 'bright', 'calm', 'eager',
	'fancy', 'gentle', 'happy', 'jolly', 'keen', 'lively', 'merry', 'nice',
	'proud', 'silly', 'brave', 'kind', 'wise', 'cool', 'rad', 'epic',
	'cosmic', 'cyber', 'neon', 'pixel', 'retro', 'turbo', 'hyper', 'mega'
];
const nouns = [
	'coder', 'dev', 'hacker', 'ninja', 'wizard', 'guru', 'sage', 'monk',
	'fox', 'wolf', 'bear', 'hawk', 'owl', 'panda', 'tiger', 'dragon',
	'byte', 'pixel', 'node', 'stack', 'loop', 'func', 'var', 'const',
	'coffee', 'pizza', 'taco', 'ramen', 'waffle', 'donut', 'bagel', 'toast'
];

function generateUsername() {
	const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
	const noun = nouns[Math.floor(Math.random() * nouns.length)];
	const num = Math.floor(Math.random() * 100);
	return `${adj}_${noun}${num}`;
}

// Timezone offset to approximate coordinates (rough mapping)
function timezoneToCoords(offset) {
	// offset is in minutes, convert to hours
	const hours = -offset / 60;
	// Rough longitude estimate: each hour = 15 degrees
	const lng = hours * 15;
	// Add some randomness to latitude (between -50 and 60 for populated areas)
	const lat = (Math.random() * 110) - 50;
	// Clamp values
	return {
		lng: Math.max(-180, Math.min(180, lng + (Math.random() - 0.5) * 30)),
		lat: Math.max(-60, Math.min(70, lat))
	};
}

// Rate limiting for chat messages
const messageRateLimit = new Map(); // socketId -> { count, resetTime }
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const RATE_LIMIT_MAX = 5; // 5 messages per window

function checkRateLimit(socketId) {
	const now = Date.now();
	const limit = messageRateLimit.get(socketId);

	if (!limit || now > limit.resetTime) {
		messageRateLimit.set(socketId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
		return true;
	}

	if (limit.count >= RATE_LIMIT_MAX) {
		return false;
	}

	limit.count++;
	return true;
}

// Generic rate limiting for actions
const actionRateLimit = new Map(); // key -> { count, resetTime }

function checkActionRateLimit(socketId, action, maxActions = 3, window = 60000) {
	const now = Date.now();
	const key = `${socketId}-${action}`;
	const limit = actionRateLimit.get(key);

	if (!limit || now > limit.resetTime) {
		actionRateLimit.set(key, { count: 1, resetTime: now + window });
		return true;
	}

	if (limit.count >= maxActions) {
		return false;
	}

	limit.count++;
	return true;
}

// Track connected users and connections per IP
const users = new Map(); // socketId -> { username, location, coords, ip, connectedAt }
const connectionsPerIP = new Map(); // IP -> Set of socket IDs
const MAX_CONNECTIONS_PER_IP = 5;

function broadcastUsers() {
	const userList = Array.from(users.values()).map(u => ({
		coords: u.coords,
		location: u.location
	}));
	io.emit('liveUsers', userList);
	io.emit('userCount', users.size);
}

// Periodic cleanup of stale rate limit entries (every 5 minutes)
setInterval(() => {
	const now = Date.now();
	for (const [socketId, limit] of messageRateLimit.entries()) {
		// Remove entries that are more than 1 minute past their reset time
		if (now > limit.resetTime + 60000) {
			messageRateLimit.delete(socketId);
		}
	}
	for (const [key, limit] of actionRateLimit.entries()) {
		// Remove entries that are more than 1 minute past their reset time
		if (now > limit.resetTime + 60000) {
			actionRateLimit.delete(key);
		}
	}
}, 5 * 60 * 1000);

// Origin validation middleware (prevent WebSocket hijacking)
io.use((socket, next) => {
	const origin = socket.handshake.headers.origin;
	
	// Validate origin if present
	if (origin && !allowedOrigins.includes(origin)) {
		console.warn(`Rejected connection from unauthorized origin: ${origin}`);
		return next(new Error('Origin not allowed'));
	}
	
	next();
});

// Connection rate limiting middleware
io.use((socket, next) => {
	const ip = socket.handshake.address;
	const socketSet = connectionsPerIP.get(ip) || new Set();
	
	// Check if this IP has too many connections
	if (socketSet.size >= MAX_CONNECTIONS_PER_IP) {
		console.log(`Connection rejected from ${ip}: too many connections (${socketSet.size})`);
		return next(new Error('Too many connections from this IP'));
	}
	
	next();
});

io.on('connection', (socket) => {
	const username = generateUsername();
	const ip = socket.handshake.address;
	
	// Track this connection by IP
	if (!connectionsPerIP.has(ip)) {
		connectionsPerIP.set(ip, new Set());
	}
	connectionsPerIP.get(ip).add(socket.id);
	
	users.set(socket.id, {
		username,
		location: 'Global',
		coords: null,
		ip,
		connectedAt: new Date()
	});

	console.log(`${username} connected from ${ip}. Total: ${users.size}`);

	// Send the user their assigned username
	socket.emit('welcome', { username });
	broadcastUsers();

	// Handle timezone/coords from client
	socket.on('setTimezone', (offset) => {
		// Rate limit: 5 timezone changes per minute
		if (!checkActionRateLimit(socket.id, 'setTimezone', 5, 60000)) {
			socket.emit('error', 'Too many timezone changes');
			return;
		}
		
		const user = users.get(socket.id);
		
		// Validate offset is a reasonable timezone: -840 to +840 (UTC-14 to UTC+14)
		if (user && typeof offset === 'number' && 
		    Number.isFinite(offset) && 
		    offset >= -840 && offset <= 840) {
			user.coords = timezoneToCoords(offset);
			broadcastUsers();
		} else if (user) {
			socket.emit('error', 'Invalid timezone offset');
		}
	});

	// Handle location setting (chat filter)
	socket.on('setLocation', (location) => {
		// Rate limit: 5 location changes per minute
		if (!checkActionRateLimit(socket.id, 'setLocation', 5, 60000)) {
			socket.emit('error', 'Too many location changes');
			return;
		}
		
		// Validate input is a string and within valid locations
		const validLocations = ['Global', 'North America', 'Europe', 'Asia', 'South America', 'Africa', 'Oceania'];
		
		if (typeof location !== 'string' || location.length > 100) {
			socket.emit('error', 'Invalid location');
			return;
		}
		
		if (validLocations.includes(location)) {
			const user = users.get(socket.id);
			if (user) {
				user.location = location;
				socket.join(location);
			}
		} else {
			socket.emit('error', 'Invalid location');
		}
	});

	// Handle chat messages
	socket.on('chatMessage', (data) => {
		// Validate input structure early
		if (!data || typeof data !== 'object' || typeof data.text !== 'string') {
			socket.emit('error', 'Invalid message format');
			return;
		}
		
		// Validate length before processing
		if (data.text.length > 500) {
			socket.emit('error', 'Message too long (max 500 characters)');
			return;
		}
		
		// Rate limit check
		if (!checkRateLimit(socket.id)) {
			socket.emit('error', 'Please slow down');
			return;
		}

		const user = users.get(socket.id);
		
		// Sanitize the message text
		const sanitizedText = sanitizeString(data.text);
		
		// Check if message is empty after sanitization
		if (!sanitizedText) {
			return;
		}

		// Create message with server-controlled fields only
		const message = {
			id: `${socket.id}-${Date.now()}-${Math.random()}`, // Prevent ID collision
			user: user?.username || 'anon',  // Server-controlled username
			text: sanitizedText,
			location: user?.location || 'Global',  // Server-controlled location
			timestamp: new Date().toISOString()  // Server-controlled timestamp
		};

		// Broadcast to all users (Global) or specific location
		if (message.location === 'Global') {
			io.emit('chatMessage', message);
		} else {
			io.to('Global').emit('chatMessage', message);
			io.to(message.location).emit('chatMessage', message);
		}
	});

	socket.on('disconnect', () => {
		const user = users.get(socket.id);
		console.log(`${user?.username || 'unknown'} disconnected. Total: ${users.size - 1}`);
		
		// Clean up user data
		if (user && user.ip) {
			const ipSet = connectionsPerIP.get(user.ip);
			if (ipSet) {
				ipSet.delete(socket.id);
				// Remove IP entry if no more connections
				if (ipSet.size === 0) {
					connectionsPerIP.delete(user.ip);
				}
			}
		}
		
		users.delete(socket.id);
		messageRateLimit.delete(socket.id);
		
		// Clean up action rate limits for this socket
		for (const key of actionRateLimit.keys()) {
			if (key.startsWith(`${socket.id}-`)) {
				actionRateLimit.delete(key);
			}
		}
		
		broadcastUsers();
	});
});

// Enhanced string sanitization with DOMPurify
function sanitizeString(str) {
	// First validate length
	if (typeof str !== 'string' || str.length > 500) {
		return '';
	}
	
	// Use DOMPurify to strip all HTML tags and attributes
	const sanitized = DOMPurify.sanitize(str, {
		ALLOWED_TAGS: [],      // No HTML tags allowed
		ALLOWED_ATTR: [],      // No attributes allowed
		KEEP_CONTENT: true     // Keep text content
	});
	
	return sanitized.trim();
}

// Security headers middleware
app.use((req, res, next) => {
	// Content Security Policy - prevent XSS attacks
	res.setHeader('Content-Security-Policy', 
		"default-src 'self'; " +
		"script-src 'self'; " +
		"style-src 'self' 'unsafe-inline'; " +  // unsafe-inline needed for Svelte scoped styles
		"img-src 'self' data:; " +
		"font-src 'self'; " +
		"connect-src 'self' ws: wss:; " +
		"frame-ancestors 'none'; " +
		"base-uri 'self'; " +
		"form-action 'self';"
	);
	
	// HTTP Strict Transport Security (only when using HTTPS)
	if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
		res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}
	
	// Permissions Policy (replace deprecated Feature-Policy)
	res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
	
	res.setHeader('X-Content-Type-Options', 'nosniff');
	res.setHeader('X-Frame-Options', 'DENY');
	res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
	// Note: X-XSS-Protection is deprecated, CSP is the modern replacement
	
	next();
});

// SvelteKit handler
app.use(handler);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log(`Hearth server running on port ${PORT}`);
});
