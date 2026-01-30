#!/usr/bin/env node

/**
 * Hearth CLI Client
 * A command-line interface for the hearth chat platform
 * Connects to thehearth.dev socket.io server
 */

import { io } from 'socket.io-client';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const SERVER_URL = process.env.HEARTH_SERVER || 'https://thehearth.dev';
const CONFIG_PATH = path.join(process.env.HOME || process.env.USERPROFILE || '.', '.hearth-cli.json');

// ANSI color codes for terminal output
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	dim: '\x1b[2m',
	underscore: '\x1b[4m',
	blink: '\x1b[5m',
	reverse: '\x1b[7m',
	hidden: '\x1b[8m',

	// Foreground colors
	black: '\x1b[30m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',

	// Background colors
	bgBlack: '\x1b[40m',
	bgRed: '\x1b[41m',
	bgGreen: '\x1b[42m',
	bgYellow: '\x1b[43m',
	bgBlue: '\x1b[44m',
	bgMagenta: '\x1b[45m',
	bgCyan: '\x1b[46m',
	bgWhite: '\x1b[47b',
};

// State
let socket = null;
let username = '';
let isAuthenticated = false;
let userCount = 0;
let onlineUsers = [];
let selectedLocation = 'Global';
let isRunning = true;

// Load or create configuration
function loadConfig() {
	try {
		if (fs.existsSync(CONFIG_PATH)) {
			const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
			return JSON.parse(data);
		}
	} catch (err) {
		console.error(`${colors.yellow}Warning: Could not load config, using defaults${colors.reset}`);
	}
	return { username: null };
}

// Save configuration
function saveConfig(config) {
	try {
		fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
	} catch (err) {
		console.error(`${colors.red}Error: Could not save config${colors.reset}`);
	}
}

// Format timestamp for display
function formatTimestamp(isoString) {
	const date = new Date(isoString);
	const hours = date.getHours().toString().padStart(2, '0');
	const minutes = date.getMinutes().toString().padStart(2, '0');
	const seconds = date.getSeconds().toString().padStart(2, '0');
	return `${colors.dim}${hours}:${minutes}:${seconds}${colors.reset}`;
}

// Display a chat message
function displayMessage(msg) {
	// Move to new line to avoid messing up input
	process.stdout.write('\r\x1b[K');

	if (msg.isSystem) {
		console.log(`${colors.cyan}* ${msg.text}${colors.reset}`);
		return;
	}

	if (msg.isWhisper) {
		const isFromMe = msg.from === username;
		const whisperText = isFromMe
			? `${colors.magenta}[whisper to ${msg.to}]${colors.reset} ${msg.text}`
			: `${colors.magenta}[whisper from ${msg.from}]${colors.reset} ${msg.text}`;
		console.log(`${formatTimestamp(msg.timestamp)} ${whisperText}`);
		return;
	}

	// Regular message
	let usernameColor = colors.yellow;
	if (msg.verified) {
		usernameColor = colors.green; // Discord verified users
	}

	const verifiedBadge = msg.verified ? `${colors.green}✓${colors.reset} ` : '';
	const location = msg.location !== 'Global' ? `${colors.blue}[${msg.location}]${colors.reset} ` : '';

	// Handle reply indicator
	let replyPrefix = '';
	if (msg.replyTo) {
		replyPrefix = `\n${colors.dim}  └─ @${msg.replyTo.user}: ${msg.replyTo.text.slice(0, 50)}${msg.replyTo.text.length > 50 ? '...' : ''}${colors.reset}\n`;
	}

	// Highlight @mentions
	let text = msg.text;
	const mentionRegex = new RegExp(`@(${username}|(?:[a-z]+_[a-z]+\\d{1,2}))`, 'g');
	text = text.replace(mentionRegex, `${colors.cyan}$&${colors.reset}`);

	const messageLine = `${formatTimestamp(msg.timestamp)} ${location}${verifiedBadge}${usernameColor}${msg.user}:${colors.reset} ${text}`;

	console.log(replyPrefix + messageLine);
}

// City coordinates for /city command
const cities = {
	'san francisco': { lng: -122.4, lat: 37.8 },
	'los angeles': { lng: -118.2, lat: 34.1 },
	'seattle': { lng: -122.3, lat: 47.6 },
	'new york': { lng: -74.0, lat: 40.7 },
	'chicago': { lng: -87.6, lat: 41.9 },
	'austin': { lng: -97.7, lat: 30.3 },
	'toronto': { lng: -79.4, lat: 43.7 },
	'london': { lng: -0.1, lat: 51.5 },
	'paris': { lng: 2.3, lat: 48.9 },
	'berlin': { lng: 13.4, lat: 52.5 },
	'amsterdam': { lng: 4.9, lat: 52.4 },
	'tokyo': { lng: 139.7, lat: 35.7 },
	'seoul': { lng: 127.0, lat: 37.6 },
	'singapore': { lng: 103.8, lat: 1.4 },
	'sydney': { lng: 151.2, lat: -33.9 },
	'sao paulo': { lng: -46.6, lat: -23.5 },
	'bangalore': { lng: 77.6, lat: 13.0 },
	'mumbai': { lng: 72.9, lat: 19.1 },
	'dubai': { lng: 55.3, lat: 25.3 },
	'tel aviv': { lng: 34.8, lat: 32.1 },
};

// Show help message
function showHelp() {
	console.log(`\n${colors.bright}Hearth CLI Commands${colors.reset}`);
	console.log(`${colors.cyan}/help${colors.reset}       - Show this help message`);
	console.log(`${colors.cyan}/name <name>${colors.reset} - Set your display name`);
	console.log(`${colors.cyan}/city <city>${colors.reset} - Set your location on the map`);
	console.log(`${colors.cyan}/users${colors.reset}      - List online users (${userCount} online)`);
	console.log(`${colors.cyan}/w <user> <msg>${colors.reset} - Send private whisper to user`);
	console.log(`${colors.cyan}/location${colors.reset}   - Change chat region filter`);
	console.log(`${colors.cyan}/quit${colors.reset}       - Exit the CLI`);
	console.log(`${colors.dim}Messages are sent with Enter. Type @username to mention users.${colors.reset}\n`);
}

// Show online users
function showUsers() {
	process.stdout.write('\r\x1b[K');
	console.log(`\n${colors.bright}Online Users (${userCount}):${colors.reset}`);
	onlineUsers.forEach((user, index) => {
		const isMe = user === username;
		const marker = isMe ? `${colors.green}*${colors.reset} ` : '  ';
		console.log(`${marker}${colors.yellow}${user}${colors.reset}`);
	});
	console.log();
}

// Handle user commands
function handleCommand(input) {
	const parts = input.trim().split(' ');
	const command = parts[0].toLowerCase();

	switch (command) {
		case '/help':
		case '/h':
			showHelp();
			break;
		case '/name':
		case '/nick':
		case '/username':
			if (parts.length < 2) {
				console.log(`${colors.red}Usage: /name <newname>${colors.reset}`);
				console.log(`${colors.dim}2-30 chars, letters/numbers/underscore/hyphen, must start with letter${colors.reset}`);
			} else {
				const newName = parts[1];
				socket.emit('setUsername', newName);
			}
			break;
		case '/city':
			if (parts.length < 2) {
				console.log(`${colors.red}Usage: /city <cityname>${colors.reset}`);
				console.log(`${colors.dim}Cities: ${Object.keys(cities).map(c => c.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')).join(', ')}${colors.reset}`);
			} else {
				const cityName = parts.slice(1).join(' ').toLowerCase();
				const city = cities[cityName];
				if (city) {
					socket.emit('setCoords', city);
					console.log(`${colors.green}Location set to ${cityName.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')}${colors.reset}`);
				} else {
					console.log(`${colors.red}Unknown city. Try: ${Object.keys(cities).slice(0, 5).join(', ')}...${colors.reset}`);
				}
			}
			break;
		case '/users':
		case '/u':
			showUsers();
			break;
		case '/w':
		case '/whisper':
			if (parts.length < 3) {
				console.log(`${colors.red}Usage: /w <username> <message>${colors.reset}`);
			} else {
				// Send via socket, server will handle it
				return false; // Don't prevent sending to server
			}
			break;
		case '/location':
		case '/loc':
			if (parts.length < 2) {
				console.log(`${colors.red}Usage: /location <region>${colors.reset}`);
				console.log(`${colors.dim}Regions: Global, North America, Europe, Asia, South America, Africa, Oceania${colors.reset}`);
			} else {
				const newLocation = parts.slice(1).join(' ');
				const validLocations = ['Global', 'North America', 'Europe', 'Asia', 'South America', 'Africa', 'Oceania'];
				if (validLocations.includes(newLocation)) {
					selectedLocation = newLocation;
					socket.emit('setLocation', selectedLocation);
					console.log(`${colors.green}Location changed to: ${newLocation}${colors.reset}`);
				} else {
					console.log(`${colors.red}Invalid location. Valid options: ${validLocations.join(', ')}${colors.reset}`);
				}
			}
			break;
		case '/quit':
		case '/q':
		case '/exit':
		case '/logout':
			console.log(`${colors.yellow}Goodbye!${colors.reset}`);
			isRunning = false;
			socket.disconnect();
			process.exit(0);
			break;
		default:
			console.log(`${colors.red}Unknown command: ${command}${colors.reset}`);
			console.log(`${colors.dim}Type /help for available commands${colors.reset}`);
	}
	return true; // Command was handled locally
}

// Initialize readline interface
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	prompt: '> ',
	terminal: true
});

// Connect to server
function connect() {
	const config = loadConfig();

	console.log(`${colors.bright}Connecting to hearth...${colors.reset}`);
	console.log(`${colors.dim}Server: ${SERVER_URL}${colors.reset}\n`);

	socket = io(SERVER_URL, {
		transports: ['websocket', 'polling'],
		reconnection: true,
		reconnectionDelay: 1000,
		reconnectionAttempts: 5,
		auth: {
			cachedUsername: config.username || undefined
		}
	});

	// Connection established
	socket.on('connect', () => {
		console.log(`${colors.green}✓ Connected${colors.reset}`);
	});

	// Welcome message with assigned username
	socket.on('welcome', (data) => {
		username = data.username;
		isAuthenticated = data.isAuthenticated || false;

		// Save username if not authenticated
		if (!isAuthenticated) {
			saveConfig({ username });
		}

		console.log(`${colors.bright}Welcome, ${colors.yellow}${username}${colors.bright}!${colors.reset}`);
		if (isAuthenticated) {
			console.log(`${colors.green}✓ Discord authenticated${colors.reset}`);
		}

		// Update prompt
		rl.setPrompt(`${colors.dim}[${selectedLocation}]${colors.reset} ${colors.yellow}${username}${colors.reset}> `);
		rl.prompt();
	});

	// Username changed confirmation
	socket.on('usernameChanged', (data) => {
		username = data.newName;
		saveConfig({ username });
		process.stdout.write('\r\x1b[K');
		console.log(`${colors.green}Username changed: ${data.oldName} -> ${data.newName}${colors.reset}`);
		rl.setPrompt(`${colors.dim}[${selectedLocation}]${colors.reset} ${colors.yellow}${username}${colors.reset}> `);
		rl.prompt();
	});

	// Chat history
	socket.on('chatHistory', (history) => {
		if (history.length > 0) {
			console.log(`\n${colors.dim}--- Recent Messages ---${colors.reset}`);
			history.slice(-10).forEach(msg => displayMessage(msg));
			console.log(`${colors.dim}----------------------${colors.reset}\n`);
		}
		showHelp();
		rl.prompt();
	});

	// New chat message
	socket.on('chatMessage', (msg) => {
		displayMessage(msg);
		rl.prompt();
	});

	// Whisper message
	socket.on('whisper', (msg) => {
		displayMessage({
			...msg,
			isWhisper: true
		});
		rl.prompt();
	});

	// User count update
	socket.on('userCount', (count) => {
		userCount = count;
	});

	// Online users list
	socket.on('onlineUsers', (users) => {
		onlineUsers = users;
	});

	// Error message
	socket.on('error', (err) => {
		process.stdout.write('\r\x1b[K');
		console.log(`${colors.red}Error: ${err}${colors.reset}`);
		rl.prompt();
	});

	// Disconnection
	socket.on('disconnect', (reason) => {
		process.stdout.write('\r\x1b[K');
		console.log(`${colors.yellow}Disconnected: ${reason}${colors.reset}`);
		if (reason === 'io server disconnect') {
			// Server disconnected us, don't reconnect
			isRunning = false;
			process.exit(0);
		}
	});

	// Reconnection attempt
	socket.io.on('reconnect_attempt', () => {
		process.stdout.write('\r\x1b[K');
		console.log(`${colors.dim}Reconnecting...${colors.reset}`);
	});

	// Reconnection successful
	socket.io.on('reconnect', () => {
		process.stdout.write('\r\x1b[K');
		console.log(`${colors.green}✓ Reconnected${colors.reset}`);
		rl.prompt();
	});
}

// Handle user input
rl.on('line', (input) => {
	if (!isRunning) return;

	const trimmed = input.trim();

	if (!trimmed) {
		rl.prompt();
		return;
	}

	// Check if it's a command
	if (trimmed.startsWith('/')) {
		const handled = handleCommand(trimmed);
		if (handled) {
			rl.prompt();
			return;
		}
	}

	// Send chat message
	if (socket && socket.connected) {
		socket.emit('chatMessage', { text: trimmed });
	} else {
		console.log(`${colors.red}Not connected to server${colors.reset}`);
	}

	rl.prompt();
});

// Handle Ctrl+C
rl.on('SIGINT', () => {
	console.log('\n');
	if (socket && socket.connected) {
		socket.disconnect();
	}
	process.exit(0);
});

// Handle close
rl.on('close', () => {
	if (socket && socket.connected) {
		socket.disconnect();
	}
	process.exit(0);
});

// Start the client
connect();
