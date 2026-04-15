// Generate SD Favicon
// Run with: node generate-sd-favicon.js

const fs = require('fs');
const { createCanvas } = require('canvas');

try {
    // Create canvas
    const canvas = createCanvas(256, 256);
    const ctx = canvas.getContext('2d');

    // Draw background (teal)
    ctx.fillStyle = '#0f766e';
    ctx.fillRect(0, 0, 256, 256);

    // Draw SD text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 140px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SD', 128, 140);

    // Save as PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync('public/favicon.png', buffer);
    
    console.log('✅ Favicon generated: public/favicon.png');
    console.log('');
    console.log('Next steps:');
    console.log('1. Rename favicon.png to favicon.ico');
    console.log('2. Run: git add public/favicon.ico');
    console.log('3. Run: git commit -m "Replace Lovable favicon with SD logo"');
    console.log('4. Run: git push');
    
} catch (error) {
    console.error('❌ Error: canvas module not installed');
    console.log('');
    console.log('Alternative: Use online tool');
    console.log('1. Go to: https://favicon.io/favicon-generator/');
    console.log('2. Settings:');
    console.log('   - Text: SD');
    console.log('   - Background: #0f766e');
    console.log('   - Font Color: #ffffff');
    console.log('   - Font Size: 80');
    console.log('3. Download and extract to public/ folder');
}
