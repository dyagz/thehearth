import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { io, type Socket } from 'socket.io-client';

interface LiveUser {
	coords: { lng: number; lat: number } | null;
	location: string;
}

export const socket = writable<Socket | null>(null);
export const connected = writable(false);
export const username = writable('');
export const userCount = writable(0);
export const liveUsers = writable<LiveUser[]>([]);

let socketInstance: Socket | null = null;

export function initSocket() {
	if (!browser || socketInstance) return;

	const socketUrl = import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin;
	socketInstance = io(socketUrl);

	socketInstance.on('connect', () => {
		connected.set(true);
		// Send timezone offset to server
		socketInstance?.emit('setTimezone', new Date().getTimezoneOffset());
	});

	socketInstance.on('disconnect', () => {
		connected.set(false);
	});

	socketInstance.on('welcome', (data: { username: string }) => {
		username.set(data.username);
	});

	socketInstance.on('userCount', (count: number) => {
		userCount.set(count);
	});

	socketInstance.on('liveUsers', (users: LiveUser[]) => {
		liveUsers.set(users);
	});

	socket.set(socketInstance);
}

export function getSocket(): Socket | null {
	return socketInstance;
}
