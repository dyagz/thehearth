import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from '@ffmpeg-installer/ffmpeg';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath.path);

// Configuration
const VIDEO_PATH = 'C:/Users/Dan/Downloads/watermark_removed_e48eaeaf-91c9-4a49-bebb-1d03d4ae3507.mp4';
const OUTPUT_DIR = path.join(__dirname, '../static/tavern-frames');
const FPS = 10;
const WIDTH = 400;

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log('Extracting frames from video...');
console.log(`Video: ${VIDEO_PATH}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log(`FPS: ${FPS}, Width: ${WIDTH}px`);

// Extract frames using ffmpeg
ffmpeg(VIDEO_PATH)
	// Extract at specified FPS
	.fps(FPS)
	// Scale to specified width, maintaining aspect ratio
	.size(`${WIDTH}x?`)
	// Output as PNG files
	.save(path.join(OUTPUT_DIR, 'frame_%03d.png'))
	.on('start', (commandLine) => {
		console.log('FFmpeg command:', commandLine);
	})
	.on('progress', (progress) => {
		console.log(`Processing: ${progress.percent ? Math.round(progress.percent) + '%' : '...'}`);
	})
	.on('end', () => {
		console.log('\nFrame extraction complete!');

		// Count extracted frames
		const files = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.png'));
		console.log(`Total frames extracted: ${files.length}`);

		// Update the Svelte component with the correct frame count
		const sveltePath = path.join(__dirname, '../src/lib/components/TavernSceneSprite.svelte');
		let svelteContent = fs.readFileSync(sveltePath, 'utf-8');

		// Update TOTAL_FRAMES constant
		svelteContent = svelteContent.replace(
			/const TOTAL_FRAMES = \d+;/,
			`const TOTAL_FRAMES = ${files.length};`
		);

		fs.writeFileSync(sveltePath, svelteContent);
		console.log(`Updated TavernSceneSprite.svelte with ${files.length} frames`);
	})
	.on('error', (err) => {
		console.error('Error extracting frames:', err);
		process.exit(1);
	});
