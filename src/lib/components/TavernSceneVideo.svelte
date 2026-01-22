<script lang="ts">
	import { onMount } from 'svelte';

	let video: HTMLVideoElement;

	onMount(() => {
		// Ensure video plays (may need user interaction on some browsers)
		video.play().catch(() => {
			// Autoplay blocked, will play on first user interaction
			const playOnInteraction = () => {
				video.play();
				document.removeEventListener('click', playOnInteraction);
			};
			document.addEventListener('click', playOnInteraction);
		});
	});
</script>

<div class="tavern-container">
	<video
		bind:this={video}
		class="tavern-video"
		src="/tavern-scene.mp4"
		loop
		muted
		playsinline
		autoplay
	></video>
	<div class="tavern-overlay"></div>
</div>

<style>
	.tavern-container {
		width: 100%;
		height: 100%;
		position: relative;
		overflow: hidden;
		background: #0a0a0f;
	}

	.tavern-video {
		width: 100%;
		height: 100%;
		object-fit: cover;
		image-rendering: pixelated;
	}

	.tavern-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(
			180deg,
			rgba(0, 0, 0, 0.1) 0%,
			transparent 20%,
			transparent 80%,
			rgba(0, 0, 0, 0.2) 100%
		);
		pointer-events: none;
	}
</style>
