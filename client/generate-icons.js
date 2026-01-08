const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const sizes = [16, 32, 72, 96, 128, 144, 152, 180, 192, 384, 512];

// SVG template with size placeholder
const createSvg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <rect width="512" height="512" rx="102" fill="#0a0a0a"/>
  <rect x="64" y="64" width="384" height="384" rx="64" fill="#14b8a6" opacity="0.15"/>
  <g fill="none" stroke="#14b8a6" stroke-width="24" stroke-linecap="round" stroke-linejoin="round">
    <rect x="128" y="128" width="256" height="256" rx="24"/>
    <line x1="128" y1="192" x2="384" y2="192"/>
    <line x1="128" y1="320" x2="384" y2="320"/>
    <line x1="192" y1="128" x2="192" y2="192"/>
    <line x1="320" y1="128" x2="320" y2="192"/>
    <line x1="192" y1="320" x2="192" y2="384"/>
    <line x1="320" y1="320" x2="320" y2="384"/>
  </g>
  <polygon fill="#14b8a6" points="232,220 232,292 288,256"/>
</svg>`;

const iconsDir = path.join(__dirname, 'src', 'assets', 'icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Try to use sharp if available, otherwise create SVG files
async function generateIcons() {
  let sharp;
  try {
    sharp = require('sharp');
    console.log('Using sharp to generate PNG icons...');
    
    for (const size of sizes) {
      const svgBuffer = Buffer.from(createSvg(512));
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`Generated: icon-${size}x${size}.png`);
    }
    
    // Create favicon.ico (use 32x32 as base)
    const faviconPath = path.join(__dirname, 'src', 'favicon.ico');
    const svgBuffer = Buffer.from(createSvg(512));
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(faviconPath.replace('.ico', '.png'));
    
    console.log('Icon generation complete!');
  } catch (e) {
    console.log('Sharp not available. Creating SVG placeholders instead.');
    console.log('For production, install sharp: npm install sharp --save-dev');
    
    // Create SVG files as fallback
    for (const size of sizes) {
      const outputPath = path.join(iconsDir, `icon-${size}x${size}.svg`);
      fs.writeFileSync(outputPath, createSvg(size));
      console.log(`Generated: icon-${size}x${size}.svg`);
    }
  }
}

generateIcons().catch(console.error);
