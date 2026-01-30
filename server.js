import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import session from 'express-session';
import DOMPurify from 'isomorphic-dompurify';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const app = express();

// Trust proxy (Caddy)
app.set('trust proxy', 1);

// Discord OAuth config
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://thehearth.dev/auth/discord/callback';

// Session configuration
const sessionMiddleware = session({
	secret: process.env.SESSION_SECRET || 'hearth-dev-secret-change-in-prod',
	resave: false,
	saveUninitialized: false,
	cookie: {
		secure: process.env.NODE_ENV === 'production',
		httpOnly: true,
		sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
		maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
	}
});

app.use(sessionMiddleware);
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

// Validate cached username format (must match adjective_noun## pattern OR custom name)
function isValidCachedUsername(name) {
	if (typeof name !== 'string' || name.length > 30 || name.length < 2) return false;
	// Must match: word_word + 1-2 digits (generated) OR valid custom name
	const generatedPattern = /^[a-z]+_[a-z]+\d{1,2}$/;
	if (generatedPattern.test(name)) {
		// Check if parts are from our word lists
		const parts = name.match(/^([a-z]+)_([a-z]+)\d+$/);
		if (!parts) return false;
		return adjectives.includes(parts[1]) && nouns.includes(parts[2]);
	}
	// Allow custom names: alphanumeric, underscore, hyphen (no spaces, no special chars)
	const customPattern = /^[a-zA-Z][a-zA-Z0-9_-]{1,29}$/;
	return customPattern.test(name);
}

// Validate custom username (stricter for user-chosen names)
function isValidCustomUsername(name) {
	if (typeof name !== 'string') return false;
	// Length: 2-30 chars
	if (name.length < 2 || name.length > 30) return false;
	// Must start with letter, can contain letters, numbers, underscore, hyphen
	const pattern = /^[a-zA-Z][a-zA-Z0-9_-]{1,29}$/;
	if (!pattern.test(name)) return false;
	// Block reserved/system names
	const reserved = ['hearth', 'admin', 'system', 'bot', 'mod', 'moderator', 'anon', 'anonymous', 'server'];
	if (reserved.includes(name.toLowerCase())) return false;
	return true;
}

// Check if username is currently in use
function isUsernameTaken(name, excludeSocketId = null) {
	for (const [socketId, user] of users.entries()) {
		if (socketId !== excludeSocketId && user.username.toLowerCase() === name.toLowerCase()) {
			return true;
		}
	}
	return false;
}

// Timezone offset to coordinates - maps to real cities/regions
const timezoneRegions = {
	// UTC-12 to UTC+14 in 30-min increments (offset in minutes)
	'-720': [{ lng: -170, lat: -14 }], // Baker Island area
	'-660': [{ lng: -171, lat: -14 }], // Samoa
	'-600': [{ lng: -155, lat: 20 }],  // Hawaii
	'-570': [{ lng: -140, lat: -10 }], // Marquesas
	'-540': [{ lng: -135, lat: 58 }],  // Alaska
	'-480': [{ lng: -122, lat: 37 }, { lng: -122, lat: 47 }, { lng: -118, lat: 34 }], // SF, Seattle, LA
	'-420': [{ lng: -105, lat: 40 }, { lng: -112, lat: 33 }], // Denver, Phoenix
	'-360': [{ lng: -97, lat: 30 }, { lng: -87, lat: 42 }, { lng: -95, lat: 29 }], // Austin, Chicago, Houston
	'-300': [{ lng: -74, lat: 41 }, { lng: -80, lat: 26 }, { lng: -79, lat: 44 }], // NYC, Miami, Toronto
	'-240': [{ lng: -66, lat: 18 }, { lng: -58, lat: -34 }], // Puerto Rico, Buenos Aires
	'-210': [{ lng: -52, lat: 47 }],   // Newfoundland
	'-180': [{ lng: -47, lat: -23 }, { lng: -43, lat: -23 }], // Sao Paulo, Rio
	'-120': [{ lng: -25, lat: 38 }],   // Azores
	'-60':  [{ lng: -22, lat: 64 }],   // Iceland
	'0':    [{ lng: 0, lat: 52 }, { lng: -4, lat: 40 }], // London, Lisbon
	'60':   [{ lng: 2, lat: 49 }, { lng: 13, lat: 52 }, { lng: 12, lat: 42 }], // Paris, Berlin, Rome
	'120':  [{ lng: 31, lat: 30 }, { lng: 30, lat: 59 }, { lng: 21, lat: 52 }], // Cairo, Helsinki, Warsaw
	'180':  [{ lng: 37, lat: 56 }, { lng: 37, lat: -1 }], // Moscow, Nairobi
	'210':  [{ lng: 51, lat: 35 }],    // Tehran
	'240':  [{ lng: 55, lat: 25 }, { lng: 51, lat: 25 }], // Dubai, Qatar
	'270':  [{ lng: 60, lat: 25 }],    // Afghanistan
	'300':  [{ lng: 73, lat: 19 }, { lng: 67, lat: 25 }], // Mumbai, Karachi
	'330':  [{ lng: 77, lat: 13 }, { lng: 77, lat: 29 }, { lng: 88, lat: 23 }], // Bangalore, Delhi, Kolkata
	'345':  [{ lng: 85, lat: 28 }],    // Nepal
	'360':  [{ lng: 90, lat: 24 }, { lng: 100, lat: 14 }], // Dhaka, Bangkok
	'390':  [{ lng: 96, lat: 17 }],    // Myanmar
	'420':  [{ lng: 106, lat: 11 }, { lng: 100, lat: 14 }], // Ho Chi Minh, Bangkok
	'480':  [{ lng: 121, lat: 31 }, { lng: 114, lat: 22 }, { lng: 103, lat: 1 }], // Shanghai, HK, Singapore
	'525':  [{ lng: 130, lat: -2 }],   // Central Indonesia
	'540':  [{ lng: 140, lat: 36 }, { lng: 127, lat: 37 }], // Tokyo, Seoul
	'570':  [{ lng: 130, lat: -32 }],  // Adelaide
	'600':  [{ lng: 151, lat: -34 }, { lng: 145, lat: -38 }], // Sydney, Melbourne
	'660':  [{ lng: 168, lat: -45 }],  // New Zealand
	'720':  [{ lng: 174, lat: -41 }, { lng: 179, lat: -18 }], // Wellington, Fiji
	'780':  [{ lng: -171, lat: -14 }], // Samoa (UTC+13)
	'840':  [{ lng: -157, lat: 2 }],   // Line Islands
};

function timezoneToCoords(offset) {
	// Find the closest timezone region
	const regions = timezoneRegions[String(offset)] ||
		timezoneRegions[String(Math.round(offset / 60) * 60)] ||
		[{ lng: 0, lat: 30 }]; // Default fallback

	// Pick a random city from that timezone
	const region = regions[Math.floor(Math.random() * regions.length)];

	// Add small randomness (±2 degrees) to spread dots around the city
	return {
		lng: region.lng + (Math.random() - 0.5) * 4,
		lat: region.lat + (Math.random() - 0.5) * 4
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

// Get real client IP from socket (handles reverse proxy)
function getClientIP(socket) {
	// Check X-Real-IP header first (set by Caddy)
	const realIP = socket.handshake.headers['x-real-ip'];
	if (realIP) return realIP;

	// Check X-Forwarded-For header
	const forwardedFor = socket.handshake.headers['x-forwarded-for'];
	if (forwardedFor) {
		// Take the first IP in the chain (original client)
		return forwardedFor.split(',')[0].trim();
	}

	// Fallback to socket address
	return socket.handshake.address;
}

// Persistence file path
const STATE_FILE = process.env.STATE_FILE || '/tmp/hearth-state.json';

// Load persisted state
function loadState() {
	try {
		if (existsSync(STATE_FILE)) {
			const data = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
			console.log('Loaded persisted state');
			return data;
		}
	} catch (err) {
		console.error('Failed to load state:', err);
	}
	return { chatHistory: [], playlist: null };
}

// Save state to disk
function saveState() {
	try {
		writeFileSync(STATE_FILE, JSON.stringify({
			chatHistory,
			playlist: currentPlaylist
		}));
	} catch (err) {
		console.error('Failed to save state:', err);
	}
}

// Load initial state
const persistedState = loadState();

// Chat history buffer
const chatHistory = persistedState.chatHistory || [];
const MAX_HISTORY = 50;

// Current Spotify playlist (hot-swappable)
let currentPlaylist = persistedState.playlist || 'https://open.spotify.com/embed/playlist/37i9dQZF1DX786ROcOIz84?utm_source=generator&theme=0';

// Admin Discord IDs who can change playlist
const ADMIN_DISCORD_IDS = (process.env.ADMIN_DISCORD_IDS || '').split(',').filter(Boolean);

// Auto-save state periodically (every 30 seconds)
setInterval(saveState, 30000);

function addToHistory(message) {
	chatHistory.push(message);
	if (chatHistory.length > MAX_HISTORY) {
		chatHistory.shift();
	}
	saveState();
}

function broadcastUsers() {
	const userList = Array.from(users.values()).map(u => ({
		coords: u.coords,
		location: u.location
	}));
	io.emit('liveUsers', userList);
	io.emit('userCount', users.size);
	// Broadcast online usernames for @ mentions
	const usernames = Array.from(users.values()).map(u => u.username);
	io.emit('onlineUsers', usernames);
}

// Find user by username for whispers
function findUserByUsername(username) {
	for (const [socketId, user] of users.entries()) {
		if (user.username === username) {
			return { socketId, user };
		}
	}
	return null;
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

// Share session with socket.io
io.use((socket, next) => {
	const req = socket.request;
	const res = {
		getHeader: () => {},
		setHeader: () => {},
		writeHead: () => {}
	};
	sessionMiddleware(req, res, () => {
		next();
	});
});

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
	const ip = getClientIP(socket);
	const socketSet = connectionsPerIP.get(ip) || new Set();

	// Check if this IP has too many connections
	if (socketSet.size >= MAX_CONNECTIONS_PER_IP) {
		console.log(`Connection rejected from ${ip}: too many connections (${socketSet.size})`);
		return next(new Error('Too many connections from this IP'));
	}

	next();
});

io.on('connection', (socket) => {
	const session = socket.request.session;
	const discordUser = session?.discordUser;
	const cachedUsername = socket.handshake.auth?.cachedUsername;
	const cachedCoords = socket.handshake.auth?.cachedCoords;

	// Use Discord username if logged in, cached username if valid, otherwise generate new
	let username;
	if (discordUser) {
		username = discordUser.username;
	} else if (cachedUsername && isValidCachedUsername(cachedUsername)) {
		username = cachedUsername;
	} else {
		username = generateUsername();
	}
	const isAuthenticated = !!discordUser;
	const ip = getClientIP(socket);

	// Validate and use cached coords if provided
	let initialCoords = null;
	if (cachedCoords && typeof cachedCoords === 'object' &&
	    typeof cachedCoords.lng === 'number' && typeof cachedCoords.lat === 'number' &&
	    Number.isFinite(cachedCoords.lng) && Number.isFinite(cachedCoords.lat) &&
	    cachedCoords.lng >= -180 && cachedCoords.lng <= 180 &&
	    cachedCoords.lat >= -90 && cachedCoords.lat <= 90) {
		// Add small randomness so users don't stack exactly
		initialCoords = {
			lng: cachedCoords.lng + (Math.random() - 0.5) * 2,
			lat: cachedCoords.lat + (Math.random() - 0.5) * 2
		};
	}

	// Track this connection by IP
	if (!connectionsPerIP.has(ip)) {
		connectionsPerIP.set(ip, new Set());
	}
	connectionsPerIP.get(ip).add(socket.id);

	// Get cached city name if provided
	const cachedCity = socket.handshake.auth?.cachedCity || null;

	users.set(socket.id, {
		username,
		location: 'Global',
		coords: initialCoords,
		city: cachedCity,  // City name for display (e.g., "San Francisco")
		ip,
		connectedAt: new Date(),
		isAuthenticated,
		discordId: discordUser?.id || null
	});

	console.log(`${username} connected from ${ip}${isAuthenticated ? ' (Discord)' : ''}. Total: ${users.size}`);

	// Send the user their assigned username, chat history, and playlist
	socket.emit('welcome', { username, isAuthenticated });
	socket.emit('chatHistory', chatHistory);
	socket.emit('playlistUpdate', currentPlaylist);
	broadcastUsers();

	// Send private welcome message (only to the joining user, not broadcast)
	const welcomeMsg = {
		id: `system-${Date.now()}-${Math.random()}`,
		user: 'hearth',
		text: `welcome ${username}, enjoy the vibe`,
		location: 'Global',
		timestamp: new Date().toISOString(),
		isSystem: true
	};
	socket.emit('chatMessage', welcomeMsg);  // Private to this socket only

	// Handle direct coordinates from client (city picker)
	// Accepts: { lng, lat } or { lng, lat, city }
	socket.on('setCoords', (data) => {
		if (!checkActionRateLimit(socket.id, 'setCoords', 5, 60000)) {
			socket.emit('error', 'Too many location changes');
			return;
		}

		const user = users.get(socket.id);

		// Validate coords object
		if (user && data && typeof data === 'object' &&
		    typeof data.lng === 'number' && typeof data.lat === 'number' &&
		    Number.isFinite(data.lng) && Number.isFinite(data.lat) &&
		    data.lng >= -180 && data.lng <= 180 &&
		    data.lat >= -90 && data.lat <= 90) {
			// Add small randomness so users don't stack exactly
			user.coords = {
				lng: data.lng + (Math.random() - 0.5) * 2,
				lat: data.lat + (Math.random() - 0.5) * 2
			};
			// Store city name if provided (sanitize it)
			if (typeof data.city === 'string' && data.city.length <= 50) {
				user.city = sanitizeString(data.city) || null;
			}
			broadcastUsers();
		}
	});

	// Handle custom username setting (for AI agents and users who want custom names)
	socket.on('setUsername', (newName) => {
		// Rate limit: 3 username changes per 5 minutes
		if (!checkActionRateLimit(socket.id, 'setUsername', 3, 300000)) {
			socket.emit('error', 'Too many username changes. Try again in a few minutes.');
			return;
		}

		const user = users.get(socket.id);
		if (!user) return;

		// Don't allow Discord-authenticated users to change username
		if (user.isAuthenticated) {
			socket.emit('error', 'Discord users cannot change username');
			return;
		}

		// Validate the new username
		if (!isValidCustomUsername(newName)) {
			socket.emit('error', 'Invalid username. Use 2-30 chars: letters, numbers, underscore, hyphen. Must start with letter.');
			return;
		}

		// Check if username is taken
		if (isUsernameTaken(newName, socket.id)) {
			socket.emit('error', `Username "${newName}" is already taken`);
			return;
		}

		const oldName = user.username;
		user.username = newName;

		// Notify the user of their new username
		socket.emit('usernameChanged', { oldName, newName });

		// Broadcast name change to chat
		const nameChangeMsg = {
			id: `system-${Date.now()}-${Math.random()}`,
			user: 'hearth',
			text: `${oldName} is now known as ${newName}`,
			location: 'Global',
			timestamp: new Date().toISOString(),
			isSystem: true
		};
		io.emit('chatMessage', nameChangeMsg);

		// Update online users list
		broadcastUsers();

		console.log(`Username changed: ${oldName} -> ${newName}`);
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

		// Validate and sanitize reply data if present
		let replyTo = null;
		if (data.replyTo && typeof data.replyTo === 'object') {
			const { id, user: replyUser, text: replyText } = data.replyTo;
			if (typeof id === 'string' && typeof replyUser === 'string' && typeof replyText === 'string') {
				replyTo = {
					id: id.slice(0, 100),
					user: sanitizeString(replyUser).slice(0, 50),
					text: sanitizeString(replyText).slice(0, 100)
				};
			}
		}

		// Create message with server-controlled fields only
		const message = {
			id: `${socket.id}-${Date.now()}-${Math.random()}`, // Prevent ID collision
			user: user?.username || 'anon',  // Server-controlled username
			text: sanitizedText,
			location: user?.location || 'Global',  // Server-controlled location
			timestamp: new Date().toISOString(),  // Server-controlled timestamp
			verified: user?.isAuthenticated || false,  // Discord verified user
			replyTo  // Include reply reference if present
		};

		// Check for whisper command: /w username message
		if (sanitizedText.startsWith('/w ')) {
			const parts = sanitizedText.slice(3).split(' ');
			const targetUsername = parts[0];
			const whisperText = parts.slice(1).join(' ');

			if (!targetUsername || !whisperText) {
				socket.emit('error', 'Usage: /w username message');
				return;
			}

			const target = findUserByUsername(targetUsername);
			if (!target) {
				socket.emit('error', `User "${targetUsername}" not found`);
				return;
			}

			const whisperMessage = {
				id: `${socket.id}-${Date.now()}-${Math.random()}`,
				from: user?.username || 'anon',
				to: targetUsername,
				text: whisperText,
				timestamp: new Date().toISOString(),
				isWhisper: true
			};

			// Send to recipient
			io.to(target.socketId).emit('whisper', whisperMessage);
			// Send confirmation to sender
			socket.emit('whisper', whisperMessage);
			return;
		}

		// Broadcast to all users (Global) or specific location
		if (message.location === 'Global') {
			io.emit('chatMessage', message);
			addToHistory(message);
		} else {
			io.to('Global').emit('chatMessage', message);
			io.to(message.location).emit('chatMessage', message);
			addToHistory(message);
		}
	});

	socket.on('disconnect', () => {
		const user = users.get(socket.id);
		console.log(`${user?.username || 'unknown'} disconnected. Total: ${users.size - 1}`);

		// No goodbye message broadcast - reduces chat spam when agents join/leave frequently
		
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
		"script-src 'self' 'unsafe-inline'; " +  // unsafe-inline needed for SvelteKit hydration
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
		"img-src 'self' data:; " +
		"font-src 'self' https://fonts.gstatic.com; " +
		"connect-src 'self' ws: wss: https://cdn.jsdelivr.net https://nominatim.openstreetmap.org; " +
		"frame-src https://open.spotify.com https://www.youtube.com; " +  // Spotify + YouTube embeds
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

// Discord OAuth routes
app.get('/auth/discord', (req, res) => {
	if (!DISCORD_CLIENT_ID) {
		return res.status(500).send('Discord OAuth not configured');
	}

	const params = new URLSearchParams({
		client_id: DISCORD_CLIENT_ID,
		redirect_uri: DISCORD_REDIRECT_URI,
		response_type: 'code',
		scope: 'identify'
	});

	res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

app.get('/auth/discord/callback', async (req, res) => {
	const { code } = req.query;

	if (!code) {
		return res.redirect('/?error=no_code');
	}

	try {
		// Exchange code for token
		const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: DISCORD_CLIENT_ID,
				client_secret: DISCORD_CLIENT_SECRET,
				grant_type: 'authorization_code',
				code,
				redirect_uri: DISCORD_REDIRECT_URI
			})
		});

		const tokens = await tokenResponse.json();

		if (!tokens.access_token) {
			console.error('Discord token error:', tokens);
			return res.redirect('/?error=token_failed');
		}

		// Get user info
		const userResponse = await fetch('https://discord.com/api/users/@me', {
			headers: { Authorization: `Bearer ${tokens.access_token}` }
		});

		const discordUser = await userResponse.json();

		// Store in session
		req.session.discordUser = {
			id: discordUser.id,
			username: discordUser.username,
			discriminator: discordUser.discriminator,
			avatar: discordUser.avatar
		};

		req.session.save((err) => {
			if (err) console.error('Session save error:', err);
			res.redirect('/');
		});
	} catch (err) {
		console.error('Discord OAuth error:', err);
		res.redirect('/?error=oauth_failed');
	}
});

app.get('/auth/logout', (req, res) => {
	req.session.destroy(() => {
		res.redirect('/');
	});
});

app.get('/auth/me', (req, res) => {
	res.json({ user: req.session.discordUser || null });
});

// Get current playlist
app.get('/api/playlist', (req, res) => {
	res.json({ playlist: currentPlaylist });
});

// ============================================
// Simple REST API for AI Agents (no WebSocket needed)
// ============================================

// Get recent chat messages
app.get('/api/chat', (req, res) => {
	const limit = Math.min(parseInt(req.query.limit) || 20, 50);
	res.json({
		messages: chatHistory.slice(-limit),
		userCount: users.size,
		users: Array.from(users.values()).map(u => ({
			username: u.username,
			city: u.city || null
		}))
	});
});

// Post a message (simple agent API)
app.post('/api/chat', express.json(), (req, res) => {
	const { username, text, city } = req.body;

	// Validate
	if (!username || typeof username !== 'string' || !isValidCustomUsername(username)) {
		return res.status(400).json({ error: 'Invalid username. Use 2-30 chars: letters, numbers, underscore, hyphen.' });
	}
	if (!text || typeof text !== 'string' || text.length > 500) {
		return res.status(400).json({ error: 'Invalid message. Max 500 characters.' });
	}

	// Simple rate limiting by username (5 messages per minute)
	const rateLimitKey = `api-${username}`;
	if (!checkActionRateLimit(rateLimitKey, 'chat', 5, 60000)) {
		return res.status(429).json({ error: 'Rate limited. Max 5 messages per minute.' });
	}

	// Sanitize
	const sanitizedText = sanitizeString(text);
	if (!sanitizedText) {
		return res.status(400).json({ error: 'Message empty after sanitization.' });
	}

	// Create message
	const message = {
		id: `api-${Date.now()}-${Math.random()}`,
		user: username,
		text: sanitizedText,
		location: 'Global',
		timestamp: new Date().toISOString(),
		isApiUser: true  // Mark as API user
	};

	// Broadcast to all connected WebSocket users
	io.emit('chatMessage', message);
	addToHistory(message);

	// If city provided, we note it but can't show on map (no persistent connection)
	res.json({ 
		success: true, 
		message,
		note: city ? `City "${city}" noted but map presence requires WebSocket connection.` : undefined
	});
});

// Get online users and their locations
app.get('/api/users', (req, res) => {
	res.json({
		count: users.size,
		users: Array.from(users.values()).map(u => ({
			username: u.username,
			city: u.city || null,
			location: u.location
		}))
	});
});

// Set playlist (admin only)
app.post('/api/playlist', express.json(), (req, res) => {
	const discordUser = req.session?.discordUser;

	// Check if user is admin
	if (!discordUser || !ADMIN_DISCORD_IDS.includes(discordUser.id)) {
		return res.status(403).json({ error: 'Not authorized' });
	}

	const { playlist } = req.body;
	if (!playlist || typeof playlist !== 'string') {
		return res.status(400).json({ error: 'Invalid playlist URL' });
	}

	// Validate it's a Spotify embed URL
	if (!playlist.includes('open.spotify.com/embed/')) {
		return res.status(400).json({ error: 'Must be a Spotify embed URL' });
	}

	currentPlaylist = playlist;
	saveState();

	// Broadcast to all connected clients
	io.emit('playlistUpdate', currentPlaylist);

	console.log(`Playlist updated by ${discordUser.username}: ${playlist}`);
	res.json({ success: true, playlist: currentPlaylist });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
	console.log(`Hearth server running on port ${PORT}`);
});
