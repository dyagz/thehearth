<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>hearth</title>
	<meta name="description" content="you're not coding alone" />
	<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><text y='14' font-size='14'>🔥</text></svg>" />
</svelte:head>

<main class="hearth-container">
	{@render children()}
</main>

<style>
	.hearth-container {
		width: 100vw;
		height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
	}
</style>
