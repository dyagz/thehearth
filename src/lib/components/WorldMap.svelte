<script lang="ts">
	import { onMount } from 'svelte';
	import * as d3 from 'd3';
	import * as topojson from 'topojson-client';
	import { initSocket, liveUsers } from '$lib/stores/socket';

	interface ActiveDev {
		x: number;
		y: number;
		brightness: number;
		pulseOffset: number;
		coords: [number, number]; // [lng, lat]
		isLive?: boolean; // true for real connected users
	}

	let canvas: HTMLCanvasElement;
	let ctx: CanvasRenderingContext2D;
	let animationFrame: number;
	let worldData: any = null;
	let projection: d3.GeoProjection;
	let path: d3.GeoPath;
	let transform = d3.zoomIdentity;

	// Only show real connected users
	const activeDevs = $derived(
		$liveUsers
			.filter(u => u.coords)
			.map((u, i) => ({
				x: 0,
				y: 0,
				brightness: 0.9,
				pulseOffset: i * 0.5,
				coords: [u.coords!.lng, u.coords!.lat] as [number, number],
				isLive: true
			}))
	);


	function drawMap() {
		if (!ctx || !canvas || !worldData) return;

		const width = canvas.width;
		const height = canvas.height;

		// Update projection to fit canvas
		projection = d3.geoNaturalEarth1()
			.fitSize([width, height], { type: 'Sphere' });

		path = d3.geoPath(projection, ctx);

		// Ocean background
		ctx.fillStyle = '#0c0c14';
		ctx.fillRect(0, 0, width, height);

		// Apply zoom transform
		ctx.save();
		ctx.translate(transform.x, transform.y);
		ctx.scale(transform.k, transform.k);

		// Draw countries
		ctx.fillStyle = '#1a1a28';
		ctx.strokeStyle = '#252535';
		ctx.lineWidth = 0.5 / transform.k;

		const countries = topojson.feature(worldData, worldData.objects.countries) as any;

		ctx.beginPath();
		path(countries);
		ctx.fill();
		ctx.stroke();

		// Draw country borders
		const borders = topojson.mesh(worldData, worldData.objects.countries, (a: any, b: any) => a !== b);
		ctx.beginPath();
		ctx.strokeStyle = '#2a2a3a';
		ctx.lineWidth = 0.3 / transform.k;
		path(borders);
		ctx.stroke();

		ctx.restore();
	}

	function drawDevs(time: number) {
		if (!ctx || !canvas || !projection) return;

		for (const dev of activeDevs) {
			const projected = projection(dev.coords);
			if (!projected) continue;

			// Apply transform to projected coordinates
			const x = projected[0] * transform.k + transform.x;
			const y = projected[1] * transform.k + transform.y;

			// Skip if outside canvas
			if (x < -10 || x > canvas.width + 10 || y < -10 || y > canvas.height + 10) continue;

			const pulse = Math.sin(time / 1000 + dev.pulseOffset) * 0.3 + 0.7;
			const brightness = dev.brightness * pulse;

			// Live users are brighter and larger
			const baseSize = dev.isLive ? 8 : 5;
			const size = Math.max(4, baseSize * transform.k);

			// Different color for live users (brighter orange/yellow)
			const color = dev.isLive ? '255, 180, 80' : '232, 165, 75';
			const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
			gradient.addColorStop(0, `rgba(${color}, ${brightness * 0.95})`);
			gradient.addColorStop(0.5, `rgba(${color}, ${brightness * 0.4})`);
			gradient.addColorStop(1, `rgba(${color}, 0)`);
			ctx.fillStyle = gradient;
			ctx.fillRect(x - size, y - size, size * 2, size * 2);

			const dotSize = Math.max(1, (dev.isLive ? 3 : 2) * transform.k);
			ctx.fillStyle = `rgba(255, 220, 120, ${brightness})`;
			ctx.fillRect(x - dotSize / 2, y - dotSize / 2, dotSize, dotSize);
		}
	}

	function animate(time: number) {
		drawMap();
		drawDevs(time);
		animationFrame = requestAnimationFrame(animate);
	}

	function resize() {
		if (!canvas) return;
		canvas.width = canvas.offsetWidth;
		canvas.height = canvas.offsetHeight;
	}

	onMount(async () => {
		ctx = canvas.getContext('2d')!;
		resize();

		// Initialize socket for live user data
		initSocket();

		// Set up zoom behavior
		const zoom = d3.zoom<HTMLCanvasElement, unknown>()
			.scaleExtent([1, 8])
			.on('zoom', (event) => {
				transform = event.transform;
			});

		d3.select(canvas).call(zoom);

		// Fetch world topology data
		try {
			const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
			worldData = await response.json();
			animate(0);
		} catch (error) {
			console.error('Failed to load world map data:', error);
		}

		window.addEventListener('resize', resize);

		return () => {
			cancelAnimationFrame(animationFrame);
			window.removeEventListener('resize', resize);
		};
	});
</script>

<canvas bind:this={canvas} class="world-map"></canvas>

<style>
	.world-map {
		width: 100%;
		height: 100%;
		position: absolute;
		top: 0;
		left: 0;
		opacity: 0.85;
		cursor: grab;
	}

	.world-map:active {
		cursor: grabbing;
	}
</style>
