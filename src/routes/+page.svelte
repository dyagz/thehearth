<script lang="ts">
	import WorldMap from '$lib/components/WorldMap.svelte';
	import PresenceCounter from '$lib/components/PresenceCounter.svelte';
	import FloatingSnippets from '$lib/components/FloatingSnippets.svelte';
	import TavernSceneSprite from '$lib/components/TavernSceneSprite.svelte';
	import AmbientAudio from '$lib/components/AmbientAudio.svelte';
	import GlobalChat from '$lib/components/GlobalChat.svelte';
</script>

<div class="hearth">
	<!-- Left panel: Tavern scene -->
	<section class="panel tavern-panel">
		<TavernSceneSprite />
		<div class="panel-content">
			<h1 class="title">hearth</h1>
			<p class="tagline">coding together, wherever</p>
		</div>
	</section>

	<!-- Divider -->
	<div class="divider"></div>

	<!-- Right panel: World map + Chat -->
	<section class="panel map-panel">
		<div class="map-area">
			<WorldMap />
			<FloatingSnippets />
			<div class="panel-content map-content">
				<PresenceCounter />
			</div>
		</div>
		<div class="chat-area">
			<GlobalChat />
		</div>
	</section>

	<!-- Audio control -->
	<AmbientAudio />
</div>

<style>
	.hearth {
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: row;
	}

	.panel {
		flex: 1;
		position: relative;
		overflow: hidden;
	}

	.panel-content {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 10;
		pointer-events: none;
	}

	.tavern-panel .panel-content {
		justify-content: flex-end;
		padding-bottom: 3rem;
	}

	.title {
		font-family: var(--font-pixel);
		font-size: 2rem;
		color: var(--ember);
		text-shadow: var(--glow-ember);
		letter-spacing: 6px;
		margin-bottom: 0.75rem;
		animation: flicker 10s infinite;
	}

	.tagline {
		font-family: var(--font-terminal);
		font-size: 1.1rem;
		color: var(--text-dim);
		letter-spacing: 2px;
	}

	.divider {
		width: 2px;
		background: linear-gradient(
			180deg,
			transparent 0%,
			var(--ash) 20%,
			var(--ember-dim) 50%,
			var(--ash) 80%,
			transparent 100%
		);
		box-shadow: 0 0 10px rgba(232, 165, 75, 0.3);
	}

	.map-panel {
		background: var(--bg-deep);
		display: flex;
		flex-direction: column;
	}

	.map-area {
		flex: 1;
		position: relative;
		min-height: 0;
	}

	.chat-area {
		height: 200px;
		flex-shrink: 0;
	}

	.map-content {
		justify-content: center;
	}

	@keyframes flicker {
		0%, 100% { opacity: 1; }
		95% { opacity: 1; }
		96% { opacity: 0.85; }
		97% { opacity: 1; }
		98% { opacity: 0.9; }
		99% { opacity: 1; }
	}

	/* Responsive: stack on narrow screens */
	@media (max-width: 900px) {
		.hearth {
			flex-direction: column;
		}

		.divider {
			width: 100%;
			height: 2px;
		}

		.tavern-panel .panel-content {
			justify-content: center;
			padding-bottom: 0;
		}
	}
</style>
