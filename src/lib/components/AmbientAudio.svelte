<script lang="ts">
	import { onMount } from 'svelte';

	let audioContext: AudioContext | null = null;
	let isPlaying = $state(false);
	let masterGain: GainNode | null = null;
	let crackleInterval: number | null = null;

	function initAudio() {
		if (audioContext) return;
		audioContext = new AudioContext();
		masterGain = audioContext.createGain();
		masterGain.gain.value = 0.3;
		masterGain.connect(audioContext.destination);
	}

	function createCrackle() {
		if (!audioContext || !masterGain) return;

		// Create noise burst for crackle
		const bufferSize = audioContext.sampleRate * 0.05; // 50ms
		const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
		const data = buffer.getChannelData(0);

		// Fill with noise
		for (let i = 0; i < bufferSize; i++) {
			data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
		}

		const source = audioContext.createBufferSource();
		source.buffer = buffer;

		// Filter for fire-like sound
		const filter = audioContext.createBiquadFilter();
		filter.type = 'bandpass';
		filter.frequency.value = 800 + Math.random() * 1200;
		filter.Q.value = 1;

		const gain = audioContext.createGain();
		gain.gain.value = 0.1 + Math.random() * 0.2;

		source.connect(filter);
		filter.connect(gain);
		gain.connect(masterGain);

		source.start();
	}

	function createDeepCrackle() {
		if (!audioContext || !masterGain) return;

		// Deeper pop sound
		const osc = audioContext.createOscillator();
		osc.type = 'sine';
		osc.frequency.value = 80 + Math.random() * 60;

		const gain = audioContext.createGain();
		gain.gain.setValueAtTime(0.15, audioContext.currentTime);
		gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

		osc.connect(gain);
		gain.connect(masterGain);

		osc.start();
		osc.stop(audioContext.currentTime + 0.1);
	}

	function createAmbientHum() {
		if (!audioContext || !masterGain) return;

		// Very low ambient rumble
		const osc = audioContext.createOscillator();
		osc.type = 'sine';
		osc.frequency.value = 40;

		const gain = audioContext.createGain();
		gain.gain.value = 0.02;

		// Slight modulation
		const lfo = audioContext.createOscillator();
		lfo.frequency.value = 0.2;
		const lfoGain = audioContext.createGain();
		lfoGain.gain.value = 5;
		lfo.connect(lfoGain);
		lfoGain.connect(osc.frequency);

		osc.connect(gain);
		gain.connect(masterGain);

		lfo.start();
		osc.start();

		return { osc, lfo };
	}

	let ambientOscillators: { osc: OscillatorNode; lfo: OscillatorNode } | null = null;

	function startFireSounds() {
		if (isPlaying) return;

		initAudio();
		if (!audioContext) return;

		// Resume context if suspended (browser autoplay policy)
		if (audioContext.state === 'suspended') {
			audioContext.resume();
		}

		isPlaying = true;

		// Start ambient hum
		ambientOscillators = createAmbientHum();

		// Random crackles
		function scheduleCrackles() {
			if (!isPlaying) return;

			// Small crackle
			if (Math.random() > 0.4) {
				createCrackle();
			}

			// Occasional deep pop
			if (Math.random() > 0.85) {
				createDeepCrackle();
			}

			// Schedule next
			const nextTime = 100 + Math.random() * 300;
			crackleInterval = window.setTimeout(scheduleCrackles, nextTime);
		}

		scheduleCrackles();
	}

	function stopFireSounds() {
		isPlaying = false;

		if (crackleInterval) {
			clearTimeout(crackleInterval);
			crackleInterval = null;
		}

		if (ambientOscillators) {
			ambientOscillators.osc.stop();
			ambientOscillators.lfo.stop();
			ambientOscillators = null;
		}
	}

	function toggle() {
		if (isPlaying) {
			stopFireSounds();
		} else {
			startFireSounds();
		}
	}

	onMount(() => {
		return () => {
			stopFireSounds();
			if (audioContext) {
				audioContext.close();
			}
		};
	});
</script>

<button
	class="audio-toggle"
	onclick={toggle}
	title={isPlaying ? 'Mute fire sounds' : 'Play fire sounds'}
	aria-label={isPlaying ? 'Mute fire sounds' : 'Play fire sounds'}
>
	{#if isPlaying}
		<span class="icon">♪</span>
	{:else}
		<span class="icon muted">♪</span>
	{/if}
</button>

<style>
	.audio-toggle {
		position: fixed;
		bottom: 1rem;
		right: 1rem;
		width: 2.5rem;
		height: 2.5rem;
		border: 1px solid var(--ash);
		border-radius: 4px;
		background: rgba(10, 10, 15, 0.8);
		color: var(--ember);
		font-family: var(--font-terminal);
		font-size: 1.2rem;
		cursor: pointer;
		z-index: 100;
		transition: all 0.2s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.audio-toggle:hover {
		border-color: var(--ember);
		box-shadow: 0 0 10px rgba(232, 165, 75, 0.3);
	}

	.icon {
		text-shadow: 0 0 8px var(--ember);
	}

	.icon.muted {
		opacity: 0.4;
		text-shadow: none;
	}
</style>
