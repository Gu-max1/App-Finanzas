#!/bin/bash
# Run this script once to generate PNG icons from the SVG
# Requires: inkscape or rsvg-convert or ImageMagick (convert)
# Usage: bash generate-icons.sh

SIZES=(72 96 128 144 152 192 384 512)

for size in "${SIZES[@]}"; do
  echo "Generating icon-${size}x${size}.png..."
  if command -v convert &> /dev/null; then
    convert -background '#0284c7' -fill white -gravity center \
      -font DejaVu-Sans-Bold -pointsize $((size/3)) \
      -size ${size}x${size} \
      label:'FT' \
      "icon-${size}x${size}.png"
  else
    echo "ImageMagick not found. Using placeholder SVG conversion."
    # Fallback: just copy the SVG placeholder
    cp icon-placeholder.svg "icon-${size}x${size}.png" 2>/dev/null || true
  fi
done
echo "Done!"
