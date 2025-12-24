/**
 * Generate Splash Screen Logo
 * Purpose: Creates a simple splash logo PNG for the native splash screen
 * The animated splash will take over immediately, so this just needs to provide
 * a smooth visual transition with matching colors.
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SPLASH_SIZE = 200;
const LOGO_SIZE = 140;
const OUTPUT_PATH = path.join(__dirname, '..', 'assets', 'splash-logo.png');

async function generateSplashLogo() {
  console.log('Generating splash logo...');

  // Create a white "F" on transparent background
  // This matches the animated splash screen logo
  const svg = `
    <svg width="${SPLASH_SIZE}" height="${SPLASH_SIZE}" viewBox="0 0 ${SPLASH_SIZE} ${SPLASH_SIZE}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.25"/>
        </filter>
      </defs>
      <!-- Logo container -->
      <rect 
        x="${(SPLASH_SIZE - LOGO_SIZE) / 2}" 
        y="${(SPLASH_SIZE - LOGO_SIZE) / 2}" 
        width="${LOGO_SIZE}" 
        height="${LOGO_SIZE}" 
        rx="38" 
        fill="rgba(255, 255, 255, 0.97)"
        filter="url(#shadow)"
      />
      <!-- F letter -->
      <text 
        x="${SPLASH_SIZE / 2}" 
        y="${SPLASH_SIZE / 2 + 28}" 
        text-anchor="middle" 
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        font-size="80" 
        font-weight="800" 
        fill="#4F46E5"
      >F</text>
      <!-- Trending arrow accent -->
      <path 
        d="M${SPLASH_SIZE / 2 + 35} ${SPLASH_SIZE / 2 - 35} l12 -8 l-3 8 l8 -3 l-17 15" 
        stroke="#22D3EE" 
        stroke-width="2.5" 
        fill="none" 
        stroke-linecap="round" 
        stroke-linejoin="round"
      />
    </svg>
  `;

  try {
    await sharp(Buffer.from(svg))
      .resize(SPLASH_SIZE, SPLASH_SIZE)
      .png()
      .toFile(OUTPUT_PATH);

    console.log(`✓ Splash logo saved to: ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('Error generating splash logo:', error);
    process.exit(1);
  }
}

generateSplashLogo();

