<script lang="ts">
	import { onMount } from 'svelte';
	import { initSocket, getSocket, connected, username, userCount } from '$lib/stores/socket';

	interface Message {
		id: number;
		user: string;
		text: string;
		location: string;
		timestamp: string;
	}

	const LOCATIONS = ['Global', 'North America', 'Europe', 'Asia', 'South America', 'Africa', 'Oceania'];

	let messages = $state<Message[]>([]);
	let selectedLocation = $state('Global');
	let inputText = $state('');
	let chatContainer: HTMLDivElement;

	function scrollToBottom() {
		setTimeout(() => {
			if (chatContainer) {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}
		}, 10);
	}

	function sendMessage() {
		const socket = getSocket();
		if (!inputText.trim() || !socket || !$connected) return;

		socket.emit('chatMessage', {
			text: inputText.trim(),
		});

		inputText = '';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	const filteredMessages = $derived(
		selectedLocation === 'Global'
			? messages
			: messages.filter(m => m.location === selectedLocation)
	);

	$effect(() => {
		const socket = getSocket();
		if (socket && $connected) {
			socket.emit('setLocation', selectedLocation);
		}
	});

	onMount(() => {
		initSocket();
		const socket = getSocket();
		if (!socket) return;

		socket.on('chatMessage', (msg: Message) => {
			messages = [...messages, msg];
			if (messages.length > 100) {
				messages = messages.slice(-100);
			}
			scrollToBottom();
		});

		socket.on('error', (err: string) => {
			console.error('Chat error:', err);
		});
	});
</script>

<div class="chat-container">
	<div class="chat-header">
		<div class="header-row">
			<select bind:value={selectedLocation} class="location-select">
				{#each LOCATIONS as loc}
					<option value={loc}>{loc}</option>
				{/each}
			</select>
			<span class="status" class:connected={$connected}>
				{$connected ? $userCount + ' online' : 'connecting...'}
			</span>
		</div>
	</div>

	<div class="chat-messages" bind:this={chatContainer}>
		{#each filteredMessages as msg (msg.id)}
			<div class="message">
				<span class="user">{msg.user}</span>
				<span class="text">{msg.text}</span>
			</div>
		{/each}
		{#if filteredMessages.length === 0}
			<div class="empty-chat">no messages yet...</div>
		{/if}
	</div>

	<div class="chat-input">
		<input
			type="text"
			bind:value={inputText}
			onkeydown={handleKeydown}
			placeholder={$connected ? `${$username}: say something...` : 'connecting...'}
			disabled={!$connected}
		/>
	</div>
</div>

<style>
	.chat-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: rgba(10, 10, 15, 0.9);
		border-top: 1px solid var(--ash);
	}

	.chat-header {
		padding: 0.5rem;
		border-bottom: 1px solid var(--ash);
	}

	.header-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.status {
		font-family: var(--font-terminal);
		font-size: 0.75rem;
		color: var(--ash);
		white-space: nowrap;
	}

	.status.connected {
		color: var(--ember);
	}

	.empty-chat {
		font-family: var(--font-terminal);
		font-size: 0.85rem;
		color: var(--ash);
		text-align: center;
		padding: 1rem;
	}

	.location-select {
		flex: 1;
		padding: 0.4rem;
		background: var(--bg-deep);
		border: 1px solid var(--ash);
		color: var(--text-dim);
		font-family: var(--font-terminal);
		font-size: 0.85rem;
		cursor: pointer;
	}

	.location-select:focus {
		outline: none;
		border-color: var(--ember);
	}

	.chat-messages {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.message {
		font-family: var(--font-terminal);
		font-size: 0.85rem;
		line-height: 1.3;
	}

	.user {
		color: var(--ember);
		margin-right: 0.5rem;
	}

	.user::after {
		content: ':';
	}

	.text {
		color: var(--text-dim);
	}

	.chat-input {
		padding: 0.5rem;
		border-top: 1px solid var(--ash);
	}

	.chat-input input {
		width: 100%;
		padding: 0.5rem;
		background: var(--bg-deep);
		border: 1px solid var(--ash);
		color: var(--text);
		font-family: var(--font-terminal);
		font-size: 0.85rem;
	}

	.chat-input input:focus {
		outline: none;
		border-color: var(--ember);
	}

	.chat-input input::placeholder {
		color: var(--ash);
	}
</style>
