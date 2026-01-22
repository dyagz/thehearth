<script lang="ts">
	import { onMount } from 'svelte';

	const TOTAL_FRAMES = 82;
	const FPS = 10;
	const FRAME_DURATION = 1000 / FPS;

	let currentFrame = $state(1);
	let images: HTMLImageElement[] = [];
	let loaded = $state(false);
	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;

	function preloadImages(): Promise<HTMLImageElement[]> {
		const promises: Promise<HTMLImageElement>[] = [];

		for (let i = 1; i <= TOTAL_FRAMES; i++) {
			const promise = new Promise<HTMLImageElement>((resolve) => {
				const img = new Image();
				img.onload = () => resolve(img);
				img.onerror = () => resolve(img); // Continue even if one fails
				img.src = `/tavern-frames/frame_${String(i).padStart(3, '0')}.png`;
			});
			promises.push(promise);
		}

		return Promise.all(promises);
	}

	function drawFrame() {
		if (!ctx || !canvas || !images[currentFrame - 1]) return;

		const img = images[currentFrame - 1];
		if (img.complete && img.naturalWidth > 0) {
			// Clear canvas
			ctx.fillStyle = '#0a0a0f';
			ctx.fillRect(0, 0, canvas.width, canvas.height);

			// Scale image to fit canvas while maintaining aspect ratio (no stretch)
			const scale = Math.min(
				canvas.width / img.naturalWidth,
				canvas.height / img.naturalHeight
			);
			const w = img.naturalWidth * scale;
			const h = img.naturalHeight * scale;
			const x = (canvas.width - w) / 2;
			const y = (canvas.height - h) / 2;

			ctx.drawImage(img, x, y, w, h);
		}
	}

	function resize() {
		if (!canvas) return;
		canvas.width = canvas.offsetWidth;
		canvas.height = canvas.offsetHeight;
		drawFrame();
	}

	onMount(async () => {
		ctx = canvas.getContext('2d')!;
		resize();

		// Preload all frames
		images = await preloadImages();
		loaded = true;
		drawFrame();

		// Animation loop
		let lastFrameTime = 0;
		let animationId: number;

		function animate(timestamp: number) {
			if (timestamp - lastFrameTime >= FRAME_DURATION) {
				currentFrame = (currentFrame % TOTAL_FRAMES) + 1;
				drawFrame();
				lastFrameTime = timestamp;
			}
			animationId = requestAnimationFrame(animate);
		}

		animationId = requestAnimationFrame(animate);

		window.addEventListener('resize', resize);

		return () => {
			cancelAnimationFrame(animationId);
			window.removeEventListener('resize', resize);
		};
	});
</script>

<div class="tavern-container">
	<canvas bind:this={canvas} class="tavern-canvas"></canvas>
	{#if !loaded}
		<div class="loading">Loading...</div>
	{/if}
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

	.tavern-canvas {
		width: 100%;
		height: 100%;
	}

	.loading {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		color: var(--ember);
		font-family: var(--font-terminal);
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
