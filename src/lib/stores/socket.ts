import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import { io, type Socket } from 'socket.io-client';

interface LiveUser {
	coords: { lng: number; lat: number } | null;
	location: string;
}

// City options with coordinates
export const cities = [
	{ name: 'San Francisco', lng: -122.4, lat: 37.8 },
	{ name: 'Los Angeles', lng: -118.2, lat: 34.1 },
	{ name: 'Seattle', lng: -122.3, lat: 47.6 },
	{ name: 'New York', lng: -74.0, lat: 40.7 },
	{ name: 'Chicago', lng: -87.6, lat: 41.9 },
	{ name: 'Austin', lng: -97.7, lat: 30.3 },
	{ name: 'Toronto', lng: -79.4, lat: 43.7 },
	{ name: 'London', lng: -0.1, lat: 51.5 },
	{ name: 'Paris', lng: 2.3, lat: 48.9 },
	{ name: 'Berlin', lng: 13.4, lat: 52.5 },
	{ name: 'Amsterdam', lng: 4.9, lat: 52.4 },
	{ name: 'Tokyo', lng: 139.7, lat: 35.7 },
	{ name: 'Seoul', lng: 127.0, lat: 37.6 },
	{ name: 'Singapore', lng: 103.8, lat: 1.4 },
	{ name: 'Sydney', lng: 151.2, lat: -33.9 },
	{ name: 'Sao Paulo', lng: -46.6, lat: -23.5 },
	{ name: 'Bangalore', lng: 77.6, lat: 13.0 },
	{ name: 'Mumbai', lng: 72.9, lat: 19.1 },
	{ name: 'Dubai', lng: 55.3, lat: 25.3 },
	{ name: 'Tel Aviv', lng: 34.8, lat: 32.1 },
];

export const socket = writable<Socket | null>(null);
export const connected = writable(false);
export const username = writable('');
export const isAuthenticated = writable(false);
export const userCount = writable(0);
export const liveUsers = writable<LiveUser[]>([]);
export const onlineUsers = writable<string[]>([]);
export const selectedCity = writable<string | null>(null);
export const currentPlaylist = writable<string>('');

let socketInstance: Socket | null = null;

export function initSocket() {
	if (!browser || socketInstance) return;

	const socketUrl = import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin;
	const cachedUsername = localStorage.getItem('hearth-username');
	const cachedCity = localStorage.getItem('hearth-city');
	const city = cachedCity ? cities.find(c => c.name === cachedCity) : null;

	socketInstance = io(socketUrl, {
		withCredentials: true,
		auth: {
			cachedUsername: cachedUsername || undefined,
			cachedCity: cachedCity || undefined,
			cachedCoords: city ? { lng: city.lng, lat: city.lat } : undefined
		}
	});

	socketInstance.on('connect', () => {
		connected.set(true);
		// Restore saved city to UI (coords already sent via auth)
		const saved = browser ? localStorage.getItem('hearth-city') : null;
		if (saved) {
			selectedCity.set(saved);
		}
	});

	socketInstance.on('disconnect', () => {
		connected.set(false);
	});

	socketInstance.on('welcome', (data: { username: string; isAuthenticated?: boolean }) => {
		username.set(data.username);
		isAuthenticated.set(data.isAuthenticated || false);
		// Cache username locally for returning users (only for anonymous users)
		if (!data.isAuthenticated) {
			localStorage.setItem('hearth-username', data.username);
		}
	});

	socketInstance.on('userCount', (count: number) => {
		userCount.set(count);
	});

	socketInstance.on('liveUsers', (users: LiveUser[]) => {
		liveUsers.set(users);
	});

	socketInstance.on('playlistUpdate', (playlist: string) => {
		currentPlaylist.set(playlist);
	});

	socketInstance.on('onlineUsers', (users: string[]) => {
		onlineUsers.set(users);
	});

	socketInstance.on('usernameChanged', (data: { oldName: string; newName: string }) => {
		username.set(data.newName);
		// Update localStorage
		if (browser) {
			localStorage.setItem('hearth-username', data.newName);
		}
	});

	socket.set(socketInstance);
}

export function setUsername(newName: string) {
	if (socketInstance) {
		socketInstance.emit('setUsername', newName);
	}
}

export function setCity(cityName: string) {
	const city = cities.find(c => c.name === cityName);
	if (city && socketInstance) {
		socketInstance.emit('setCoords', { lng: city.lng, lat: city.lat });
		selectedCity.set(cityName);
		if (browser) {
			localStorage.setItem('hearth-city', cityName);
		}
	}
}

export function getSocket(): Socket | null {
	return socketInstance;
}
