<script lang="ts">
	import { onMount } from 'svelte';

	interface Snippet {
		id: number;
		text: string;
		x: number;
		y: number;
		speed: number;
		opacity: number;
	}

	// sample code snippets that float by - anonymous, fragments
	const SAMPLE_SNIPPETS = [
		'const result = await fetch',
		'function handleClick()',
		'if (user.isAuthenticated)',
		'return { success: true }',
		'export default async',
		'import { useState }',
		'catch (error) {',
		'console.log("done")',
		'.filter(x => x > 0)',
		'SELECT * FROM users',
		'git commit -m "fix:',
		'npm run build',
		'docker-compose up',
		'async function main()',
		'interface Props {',
		'type Result<T> =',
		'.map(item => item.id)',
		'useEffect(() => {',
		'CREATE TABLE',
		'def __init__(self):',
		'fn main() -> Result',
		'pub struct Config',
		'go func() {',
		'channel <- value',
		'@app.route("/")',
		'model.fit(X, y)',
		'plt.show()',
		'kubectl apply -f',
		'terraform plan',
		'aws s3 cp',
	];

	let snippets = $state<Snippet[]>([]);
	let nextId = 0;

	function createSnippet(): Snippet {
		return {
			id: nextId++,
			text: SAMPLE_SNIPPETS[Math.floor(Math.random() * SAMPLE_SNIPPETS.length)],
			x: 10 + Math.random() * 80, // 10-90% from left
			y: 100 + Math.random() * 20, // start below viewport
			speed: 0.02 + Math.random() * 0.03, // varying speeds
			opacity: 0.3 + Math.random() * 0.4,
		};
	}

	onMount(() => {
		// start with a few snippets
		snippets = Array.from({ length: 5 }, createSnippet).map((s, i) => ({
			...s,
			y: 20 + i * 15, // spread them out initially
		}));

		// animation loop
		let lastTime = performance.now();
		let animationFrame: number;

		function animate(time: number) {
			const delta = time - lastTime;
			lastTime = time;

			snippets = snippets
				.map(s => ({
					...s,
					y: s.y - s.speed * delta / 16, // move up
					opacity: s.y < 20 ? s.opacity * 0.98 : s.opacity, // fade near top
				}))
				.filter(s => s.y > -10 && s.opacity > 0.05); // remove when off screen

			animationFrame = requestAnimationFrame(animate);
		}

		animate(performance.now());

		// add new snippets periodically
		const interval = setInterval(() => {
			if (snippets.length < 8 && Math.random() > 0.3) {
				snippets = [...snippets, createSnippet()];
			}
		}, 3000);

		return () => {
			cancelAnimationFrame(animationFrame);
			clearInterval(interval);
		};
	});
</script>

<div class="snippets-container">
	{#each snippets as snippet (snippet.id)}
		<div
			class="snippet"
			style="
				left: {snippet.x}%;
				top: {snippet.y}%;
				opacity: {snippet.opacity};
			"
		>
			{snippet.text}
		</div>
	{/each}
</div>

<style>
	.snippets-container {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		pointer-events: none;
		overflow: hidden;
		z-index: 5;
	}

	.snippet {
		position: absolute;
		font-family: var(--font-terminal);
		font-size: 1rem;
		color: var(--ash);
		white-space: nowrap;
		transform: translateX(-50%);
		transition: opacity 0.5s ease-out;
		text-shadow: 0 0 10px rgba(58, 58, 74, 0.5);
	}
</style>
