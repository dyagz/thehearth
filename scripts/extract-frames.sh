#!/bin/bash
# Extract frames from tavern video for sprite animation

INPUT_VIDEO="$1"
OUTPUT_DIR="C:/Users/Dan/hearth/static/tavern-frames"

if [ -z "$INPUT_VIDEO" ]; then
    echo "Usage: ./extract-frames.sh <video-file>"
    exit 1
fi

echo "Clearing old frames..."
rm -f "$OUTPUT_DIR"/frame_*.png

echo "Extracting frames from: $INPUT_VIDEO"
ffmpeg -i "$INPUT_VIDEO" -vf "fps=10,scale=400:-1" "$OUTPUT_DIR/frame_%03d.png"

FRAME_COUNT=$(ls -1 "$OUTPUT_DIR"/frame_*.png 2>/dev/null | wc -l)
echo "Done! Extracted $FRAME_COUNT frames to $OUTPUT_DIR"

# Update the frame count in the component if needed
echo "Frame count: $FRAME_COUNT"
