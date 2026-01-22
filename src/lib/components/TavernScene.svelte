<script lang="ts">
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let animationFrame: number;
	let time = 0;

	// color palette
	const COLORS = {
		black: '#0a0a0f',
		darkWood: '#2a1810',
		wood: '#4a2820',
		lightWood: '#6a3830',
		stone: '#3a3a4a',
		darkStone: '#2a2a35',
		ember: '#e8a54b',
		emberBright: '#ffb347',
		emberDark: '#c4793a',
		fire1: '#ff6b35',
		fire2: '#f7c242',
		fire3: '#ff8c42',
	};

	// Flame system: combines smooth base shape with organic variation
	interface FlamePoint {
		baseOffset: number;    // individual offset for organic feel
		variation: number;     // current variation amount
		targetVariation: number;
		speed: number;
	}

	let flamePoints: FlamePoint[] = [];

	// Window easter eggs - clouds and birds passing by
	interface WindowCloud {
		x: number;  // 0-1 position across window
		y: number;  // 0-1 position in window
		size: number;
		speed: number;
	}

	interface WindowBird {
		x: number;
		y: number;
		speed: number;
		wingPhase: number;
	}

	let windowClouds: WindowCloud[] = [];
	let windowBirds: WindowBird[] = [];

	function spawnCloud() {
		windowClouds.push({
			x: -0.3,
			y: 0.2 + Math.random() * 0.4,
			size: 0.15 + Math.random() * 0.15,
			speed: 0.00008 + Math.random() * 0.00006,
		});
	}

	function spawnBird() {
		windowBirds.push({
			x: -0.1,
			y: 0.2 + Math.random() * 0.5,
			speed: 0.0003 + Math.random() * 0.0002,
			wingPhase: Math.random() * Math.PI * 2,
		});
	}

	function initFlamePoints(count: number) {
		flamePoints = [];
		for (let i = 0; i < count; i++) {
			flamePoints.push({
				baseOffset: (Math.random() - 0.5) * 2, // -1 to 1
				variation: Math.random() * 1.5,
				targetVariation: Math.random() * 2,
				speed: 0.02 + Math.random() * 0.03,
			});
		}
	}

	function updateFlamePoints() {
		for (const point of flamePoints) {
			// Smoothly move variation toward target
			const diff = point.targetVariation - point.variation;
			point.variation += diff * point.speed;

			// Occasionally pick new target variation
			if (Math.random() > 0.96) {
				point.targetVariation = Math.random() * 2.5;
			}
		}
	}

	// Time-of-day sky colors
	function getSkyColors(): { sky: string; horizon?: string; showStars: boolean; starBrightness: number } {
		const hour = new Date().getHours();
		const minute = new Date().getMinutes();
		const timeValue = hour + minute / 60;

		if (timeValue >= 22 || timeValue < 5) {
			return { sky: '#0a0a1a', showStars: true, starBrightness: 1 };
		}
		if (timeValue >= 5 && timeValue < 7) {
			const progress = (timeValue - 5) / 2;
			return {
				sky: lerpColor('#0a0a1a', '#2a1a3a', progress),
				horizon: lerpColor('#1a1a2a', '#ff7b5a', progress),
				showStars: true,
				starBrightness: 1 - progress
			};
		}
		if (timeValue >= 7 && timeValue < 10) {
			const progress = (timeValue - 7) / 3;
			return {
				sky: lerpColor('#4a6080', '#6a9fcc', progress),
				horizon: lerpColor('#ff9b6a', '#8ac4e8', progress),
				showStars: false,
				starBrightness: 0
			};
		}
		if (timeValue >= 10 && timeValue < 17) {
			return { sky: '#5a8fbb', horizon: '#8ac4e8', showStars: false, starBrightness: 0 };
		}
		if (timeValue >= 17 && timeValue < 19) {
			const progress = (timeValue - 17) / 2;
			return {
				sky: lerpColor('#5a8fbb', '#4a3a5a', progress),
				horizon: lerpColor('#8ac4e8', '#ff8a5a', progress),
				showStars: false,
				starBrightness: 0
			};
		}
		if (timeValue >= 19 && timeValue < 22) {
			const progress = (timeValue - 19) / 3;
			return {
				sky: lerpColor('#3a2a4a', '#0a0a1a', progress),
				horizon: lerpColor('#8a4a5a', '#1a1a2a', progress),
				showStars: true,
				starBrightness: progress
			};
		}
		return { sky: '#0a0a1a', showStars: true, starBrightness: 1 };
	}

	function lerpColor(color1: string, color2: string, t: number): string {
		const c1 = hexToRgb(color1);
		const c2 = hexToRgb(color2);
		const r = Math.round(c1.r + (c2.r - c1.r) * t);
		const g = Math.round(c1.g + (c2.g - c1.g) * t);
		const b = Math.round(c1.b + (c2.b - c1.b) * t);
		return `rgb(${r}, ${g}, ${b})`;
	}

	function hexToRgb(hex: string): { r: number; g: number; b: number } {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : { r: 0, g: 0, b: 0 };
	}

	function drawPixel(x: number, y: number, size: number, color: string) {
		ctx.fillStyle = color;
		ctx.fillRect(x * size, y * size, size, size);
	}

	function drawRect(x: number, y: number, w: number, h: number, size: number, color: string) {
		ctx.fillStyle = color;
		ctx.fillRect(x * size, y * size, w * size, h * size);
	}

	function drawTavern(t: number) {
		if (!ctx || !canvas) return;

		const width = canvas.width;
		const height = canvas.height;
		const pixelSize = Math.max(4, Math.floor(width / 80));
		const cols = Math.floor(width / pixelSize);
		const rows = Math.floor(height / pixelSize);

		// Clear
		ctx.fillStyle = COLORS.black;
		ctx.fillRect(0, 0, width, height);

		// Back wall (stone)
		for (let x = 0; x < cols; x++) {
			for (let y = 0; y < rows * 0.7; y++) {
				const noise = Math.sin(x * 0.5) * Math.cos(y * 0.3) > 0;
				drawPixel(x, y, pixelSize, noise ? COLORS.stone : COLORS.darkStone);
			}
		}

		// Wooden floor
		for (let x = 0; x < cols; x++) {
			for (let y = Math.floor(rows * 0.7); y < rows; y++) {
				const plank = Math.floor(x / 4) % 2 === 0;
				drawPixel(x, y, pixelSize, plank ? COLORS.wood : COLORS.darkWood);
			}
		}

		// Fireplace frame
		const fpX = Math.floor(cols * 0.3);
		const fpY = Math.floor(rows * 0.25);
		const fpW = Math.floor(cols * 0.4);
		const fpH = Math.floor(rows * 0.45);

		drawRect(fpX + 2, fpY + 2, fpW - 4, fpH - 2, pixelSize, COLORS.black);
		drawRect(fpX, fpY, fpW, 3, pixelSize, COLORS.stone);
		drawRect(fpX, fpY, 3, fpH, pixelSize, COLORS.stone);
		drawRect(fpX + fpW - 3, fpY, 3, fpH, pixelSize, COLORS.stone);
		drawRect(fpX - 2, fpY + fpH - 2, fpW + 4, 4, pixelSize, COLORS.darkStone);
		drawRect(fpX - 3, fpY - 2, fpW + 6, 3, pixelSize, COLORS.lightWood);

		// Fire
		const fireBaseY = fpY + fpH - 6;
		const fireBaseX = fpX + 5;
		const fireWidth = fpW - 10;

		// Logs
		drawRect(fireBaseX + 2, fireBaseY + 3, fireWidth - 4, 2, pixelSize, COLORS.darkWood);
		drawRect(fireBaseX + 4, fireBaseY + 2, fireWidth - 8, 2, pixelSize, COLORS.wood);

		// Draw fire - combined smooth base wave with organic variation
		const flameColumns = fireWidth - 4;
		for (let i = 0; i < flameColumns; i++) {
			const normalizedX = i / flameColumns; // 0 to 1 across fire width
			const flameX = fireBaseX + 2 + i;

			// Base height: gentle wave that creates cohesive shape
			// Higher in center, lower at edges (natural fire shape)
			const centerFactor = 1 - Math.abs(normalizedX - 0.5) * 1.2; // peak in middle
			const baseHeight = 4 + centerFactor * 3;

			// Slow, gentle wave motion (keeps fire feeling connected)
			const waveOffset = Math.sin(t / 1500 + normalizedX * Math.PI * 2) * 0.8;

			// Individual point variation (adds organic feel without fragmenting)
			const pointIndex = Math.min(i, flamePoints.length - 1);
			const pointVariation = flamePoints[pointIndex]?.variation || 0;
			const pointOffset = flamePoints[pointIndex]?.baseOffset || 0;

			// Combined height
			const flameHeight = Math.max(2, baseHeight + waveOffset + pointVariation + pointOffset);

			// Draw flame column
			for (let h = 0; h < flameHeight; h++) {
				const normalizedH = h / flameHeight;
				let color;

				// Color gradient: yellow core -> orange -> red tips
				if (normalizedH < 0.3) {
					color = COLORS.fire2; // bright yellow core
				} else if (normalizedH < 0.6) {
					color = COLORS.fire3; // orange middle
				} else {
					color = COLORS.fire1; // red tips
				}

				drawPixel(flameX, fireBaseY - h, pixelSize, color);
			}
		}

		// Glowing ember bed at base (stable, not flickery)
		for (let i = 0; i < flameColumns; i++) {
			const emberBrightness = 0.6 + Math.sin(t / 2000 + i * 0.5) * 0.2;
			const emberColor = emberBrightness > 0.7 ? COLORS.emberBright : COLORS.ember;
			drawPixel(fireBaseX + 2 + i, fireBaseY + 1, pixelSize, emberColor);
		}

		// Slow floating embers
		for (let i = 0; i < 3; i++) {
			const seed = i * 1234;
			const cycle = 10000; // 10 second cycle
			const progress = ((t + seed) % cycle) / cycle;

			if (progress < 0.7) {
				const startX = fireBaseX + 4 + ((seed % 100) / 100) * (fireWidth - 8);
				const drift = Math.sin(progress * Math.PI * 2) * 2;
				const emberX = startX + drift;
				const emberY = fireBaseY - 2 - progress * 35;
				const alpha = progress < 0.5 ? 0.6 : (1 - (progress - 0.5) / 0.2) * 0.6;

				ctx.fillStyle = `rgba(255, 179, 71, ${Math.max(0, alpha)})`;
				ctx.fillRect(emberX * pixelSize, emberY * pixelSize, pixelSize * 0.5, pixelSize * 0.5);
			}
		}

		// Warm glow from fire
		const glowPulse = 0.12 + Math.sin(t / 3000) * 0.02;
		const gradient = ctx.createRadialGradient(
			(fpX + fpW / 2) * pixelSize,
			(fireBaseY - 2) * pixelSize,
			0,
			(fpX + fpW / 2) * pixelSize,
			(fireBaseY - 2) * pixelSize,
			width * 0.6
		);
		gradient.addColorStop(0, `rgba(232, 165, 75, ${glowPulse})`);
		gradient.addColorStop(0.3, `rgba(232, 165, 75, ${glowPulse * 0.5})`);
		gradient.addColorStop(1, 'rgba(232, 165, 75, 0)');
		ctx.fillStyle = gradient;
		ctx.fillRect(0, 0, width, height);

		// Window - synced to real time
		const winX = Math.floor(cols * 0.78);
		const winY = Math.floor(rows * 0.15);
		const winW = 10;
		const winH = 14;

		const skyColors = getSkyColors();

		drawRect(winX - 1, winY - 1, winW + 2, winH + 2, pixelSize, COLORS.lightWood);

		if (skyColors.horizon) {
			const skyGradient = ctx.createLinearGradient(
				winX * pixelSize,
				winY * pixelSize,
				winX * pixelSize,
				(winY + winH) * pixelSize
			);
			skyGradient.addColorStop(0, skyColors.sky);
			skyGradient.addColorStop(1, skyColors.horizon);
			ctx.fillStyle = skyGradient;
			ctx.fillRect(winX * pixelSize, winY * pixelSize, winW * pixelSize, winH * pixelSize);
		} else {
			drawRect(winX, winY, winW, winH, pixelSize, skyColors.sky);
		}

		// Clouds passing by window (only during day/dawn/dusk)
		if (!skyColors.showStars || skyColors.starBrightness < 0.5) {
			for (const cloud of windowClouds) {
				const cloudX = winX + cloud.x * winW;
				const cloudY = winY + cloud.y * winH;
				const cloudSize = cloud.size * winW;

				ctx.fillStyle = 'rgba(200, 200, 220, 0.6)';
				// Simple fluffy cloud shape
				ctx.beginPath();
				ctx.arc(cloudX * pixelSize, cloudY * pixelSize, cloudSize * pixelSize * 0.4, 0, Math.PI * 2);
				ctx.arc((cloudX + cloudSize * 0.3) * pixelSize, (cloudY - cloudSize * 0.1) * pixelSize, cloudSize * pixelSize * 0.3, 0, Math.PI * 2);
				ctx.arc((cloudX + cloudSize * 0.6) * pixelSize, cloudY * pixelSize, cloudSize * pixelSize * 0.35, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		// Birds passing by window
		for (const bird of windowBirds) {
			const birdX = winX + bird.x * winW;
			const birdY = winY + bird.y * winH;
			const wingAngle = Math.sin(t / 60 + bird.wingPhase) * 0.6;
			const birdSize = 0.8;

			// Only draw if within window bounds
			if (bird.x > 0 && bird.x < 1) {
				ctx.strokeStyle = 'rgba(40, 40, 50, 0.7)';
				ctx.lineWidth = 1;
				ctx.beginPath();
				ctx.moveTo((birdX - birdSize) * pixelSize, (birdY + wingAngle * birdSize) * pixelSize);
				ctx.lineTo(birdX * pixelSize, birdY * pixelSize);
				ctx.lineTo((birdX + birdSize) * pixelSize, (birdY + wingAngle * birdSize) * pixelSize);
				ctx.stroke();
			}
		}

		drawRect(winX + winW / 2 - 0.5, winY, 1, winH, pixelSize, COLORS.wood);
		drawRect(winX, winY + winH / 2 - 0.5, winW, 1, pixelSize, COLORS.wood);

		// Stars
		if (skyColors.showStars && skyColors.starBrightness > 0) {
			const stars = [[2, 3], [7, 2], [4, 8], [8, 6], [3, 11]];
			for (const [sx, sy] of stars) {
				const twinkle = Math.sin(t / 1200 + sx * sy) * 0.3 + 0.7;
				if (twinkle > 0.5) {
					const alpha = twinkle * skyColors.starBrightness;
					ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
					ctx.fillRect((winX + sx) * pixelSize, (winY + sy) * pixelSize, pixelSize / 2, pixelSize / 2);
				}
			}
		}

		// Wooden beam
		drawRect(0, 3, cols, 2, pixelSize, COLORS.darkWood);

		// Lantern on left wall
		const lanternX = Math.floor(cols * 0.1);
		const lanternY = Math.floor(rows * 0.25);
		drawRect(lanternX, lanternY, 3, 4, pixelSize, COLORS.wood);
		const lanternFlicker = Math.sin(t / 500) * 0.1 + 0.9;
		ctx.fillStyle = `rgba(232, 165, 75, ${0.08 * lanternFlicker})`;
		ctx.beginPath();
		ctx.arc((lanternX + 1.5) * pixelSize, (lanternY + 2) * pixelSize, pixelSize * 6, 0, Math.PI * 2);
		ctx.fill();
		drawPixel(lanternX + 1, lanternY + 1, pixelSize, COLORS.emberBright);
	}

	function updateWindowElements() {
		// Update clouds
		for (const cloud of windowClouds) {
			cloud.x += cloud.speed;
		}
		// Remove clouds that have passed
		windowClouds = windowClouds.filter(c => c.x < 1.5);

		// Update birds
		for (const bird of windowBirds) {
			bird.x += bird.speed;
		}
		// Remove birds that have passed
		windowBirds = windowBirds.filter(b => b.x < 1.3);
	}

	function animate(timestamp: number) {
		time = timestamp;
		updateFlamePoints();
		updateWindowElements();
		drawTavern(time);
		animationFrame = requestAnimationFrame(animate);
	}

	function resize() {
		if (!canvas) return;
		canvas.width = canvas.offsetWidth;
		canvas.height = canvas.offsetHeight;
	}

	onMount(() => {
		ctx = canvas.getContext('2d')!;
		resize();
		initFlamePoints(20); // flame variation points
		animate(0);

		window.addEventListener('resize', resize);

		// Spawn occasional clouds (every 15-30 seconds)
		const cloudInterval = setInterval(() => {
			if (windowClouds.length < 2 && Math.random() > 0.4) {
				spawnCloud();
			}
		}, 15000 + Math.random() * 15000);

		// Spawn rare birds (every 30-60 seconds, 30% chance)
		const birdInterval = setInterval(() => {
			if (windowBirds.length < 2 && Math.random() > 0.7) {
				spawnBird();
			}
		}, 30000 + Math.random() * 30000);

		// Start with one cloud if daytime
		const skyColors = getSkyColors();
		if (!skyColors.showStars || skyColors.starBrightness < 0.5) {
			setTimeout(() => spawnCloud(), 3000);
		}

		return () => {
			cancelAnimationFrame(animationFrame);
			window.removeEventListener('resize', resize);
			clearInterval(cloudInterval);
			clearInterval(birdInterval);
		};
	});
</script>

<div class="tavern-container">
	<canvas bind:this={canvas} class="tavern-canvas"></canvas>
	<div class="tavern-overlay"></div>
</div>

<style>
	.tavern-container {
		width: 100%;
		height: 100%;
		position: relative;
		overflow: hidden;
	}

	.tavern-canvas {
		width: 100%;
		height: 100%;
		image-rendering: pixelated;
		image-rendering: crisp-edges;
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
