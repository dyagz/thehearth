<script lang="ts">
	import { initSocket, userCount } from '$lib/stores/socket';
	import { onMount } from 'svelte';

	onMount(() => {
		initSocket();
	});
</script>

<div class="presence">
	<div class="count-container">
		<span class="count">{$userCount}</span>
		<span class="label">devs by the fire</span>
	</div>
	<div class="ember-icon">
		<span class="ember">◆</span>
	</div>
</div>

<style>
	.presence {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		z-index: 10;
		animation: flicker 8s infinite;
	}

	.count-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.count {
		font-family: var(--font-pixel);
		font-size: 3rem;
		color: var(--ember);
		text-shadow: var(--glow-ember);
		letter-spacing: 4px;
	}

	.label {
		font-family: var(--font-terminal);
		font-size: 1.5rem;
		color: var(--text-dim);
		letter-spacing: 2px;
	}

	.ember-icon {
		font-size: 1.5rem;
		animation: pulse-glow 3s ease-in-out infinite;
	}

	.ember {
		color: var(--ember);
		text-shadow: var(--glow-ember);
	}

	@keyframes flicker {
		0%, 100% { opacity: 1; }
		92% { opacity: 1; }
		93% { opacity: 0.9; }
		94% { opacity: 1; }
		97% { opacity: 0.95; }
		98% { opacity: 1; }
	}

	@keyframes pulse-glow {
		0%, 100% { opacity: 0.6; transform: scale(1); }
		50% { opacity: 1; transform: scale(1.1); }
	}
</style>
