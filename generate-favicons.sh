#!/bin/bash

# Generate Favicon Files Script
# This script helps create all required favicon sizes from a source image

echo "🎨 Favicon Generator for Dr. Srivanth's Orthopedic Clinic"
echo "=========================================================="
echo ""

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed."
    echo ""
    echo "Please install ImageMagick:"
    echo "  - Windows: Download from https://imagemagick.org/script/download.php"
    echo "  - Mac: brew install imagemagick"
    echo "  - Linux: sudo apt-get install imagemagick"
    echo ""
    echo "Or use online tools:"
    echo "  - https://realfavicongenerator.net/"
    echo "  - https://favicon.io/favicon-converter/"
    exit 1
fi

# Check if source image exists
if [ ! -f "public/favicon.ico" ]; then
    echo "❌ Source favicon.ico not found in public/ folder"
    exit 1
fi

echo "✅ ImageMagick found"
echo "✅ Source favicon.ico found"
echo ""
echo "Generating favicon files..."
echo ""

# Generate different sizes
convert public/favicon.ico -resize 16x16 public/favicon-16x16.png
echo "✅ Created favicon-16x16.png"

convert public/favicon.ico -resize 32x32 public/favicon-32x32.png
echo "✅ Created favicon-32x32.png"

convert public/favicon.ico -resize 180x180 public/apple-touch-icon.png
echo "✅ Created apple-touch-icon.png"

convert public/favicon.ico -resize 192x192 public/android-chrome-192x192.png
echo "✅ Created android-chrome-192x192.png"

convert public/favicon.ico -resize 512x512 public/android-chrome-512x512.png
echo "✅ Created android-chrome-512x512.png"

echo ""
echo "🎉 All favicon files generated successfully!"
echo ""
echo "Next steps:"
echo "1. Review the generated files in public/ folder"
echo "2. Commit and push:"
echo "   git add public/*.png"
echo "   git commit -m 'Add favicon files for all devices'"
echo "   git push"
echo ""
