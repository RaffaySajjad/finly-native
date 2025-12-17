/**
 * Icon Generation Script for Finly App
 * 
 * This script generates app icons for both iOS and Android platforms
 * from the master SVG icon and automatically copies them to the correct locations.
 * 
 * Requirements:
 * - Install sharp: npm install --save-dev sharp
 * - Run: npm run generate-icons
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const iconSizes = {
  ios: [
    { size: 20, scale: 1, name: 'icon-20.png' },
    { size: 20, scale: 2, name: 'icon-20@2x.png' },
    { size: 20, scale: 3, name: 'icon-20@3x.png' },
    { size: 29, scale: 1, name: 'icon-29.png' },
    { size: 29, scale: 2, name: 'icon-29@2x.png' },
    { size: 29, scale: 3, name: 'icon-29@3x.png' },
    { size: 40, scale: 1, name: 'icon-40.png' },
    { size: 40, scale: 2, name: 'icon-40@2x.png' },
    { size: 40, scale: 3, name: 'icon-40@3x.png' },
    { size: 60, scale: 2, name: 'icon-60@2x.png' },
    { size: 60, scale: 3, name: 'icon-60@3x.png' },
    { size: 76, scale: 1, name: 'icon-76.png' },
    { size: 76, scale: 2, name: 'icon-76@2x.png' },
    { size: 83.5, scale: 2, name: 'icon-83.5@2x.png' },
    { size: 1024, scale: 1, name: 'App-Icon-1024x1024@1x.png' },
  ],
  android: [
    { size: 48, density: 'mdpi', name: 'ic_launcher.png' },
    { size: 72, density: 'hdpi', name: 'ic_launcher.png' },
    { size: 96, density: 'xhdpi', name: 'ic_launcher.png' },
    { size: 144, density: 'xxhdpi', name: 'ic_launcher.png' },
    { size: 192, density: 'xxxhdpi', name: 'ic_launcher.png' },
    { size: 48, density: 'mdpi', name: 'ic_launcher_round.png' },
    { size: 72, density: 'hdpi', name: 'ic_launcher_round.png' },
    { size: 96, density: 'xhdpi', name: 'ic_launcher_round.png' },
    { size: 144, density: 'xxhdpi', name: 'ic_launcher_round.png' },
    { size: 192, density: 'xxxhdpi', name: 'ic_launcher_round.png' },
  ],
};

async function generateIcons() {
  const svgPath = path.join(__dirname, '../assets/icon.svg');
  const outputDir = path.join(__dirname, '../assets/generated-icons');

  // Check if SVG exists
  if (!fs.existsSync(svgPath)) {
    console.error('❌ Icon SVG not found at:', svgPath);
    process.exit(1);
  }

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate iOS icons
  for (const { size, scale, name } of iconSizes.ios) {
    const actualSize = size * scale;
    const outputPath = path.join(outputDir, 'ios', name);

    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    await sharp(svgPath)
      .resize(actualSize, actualSize)
      .png()
      .toFile(outputPath);
  }

  // Generate Android icons
  for (const { size, density, name } of iconSizes.android) {
    const outputPath = path.join(
      outputDir,
      'android',
      `mipmap-${density}`,
      name
    );

    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    await sharp(svgPath).resize(size, size).png().toFile(outputPath);
  }

  // Copy main icon.png for Expo (1024x1024)
  const mainIconPath = path.join(outputDir, 'ios', 'App-Icon-1024x1024@1x.png');
  const expoIconPath = path.join(__dirname, '../assets/icon.png');
  await copyFile(mainIconPath, expoIconPath);
  console.log('📱 Created assets/icon.png for Expo');

  // Automatically copy icons to correct locations
  await copyIconsToDestinations(outputDir);
  
  console.log('✅ Icons generated successfully!');
}

/**
 * Copy generated icons to their final destinations
 */
async function copyIconsToDestinations(outputDir) {
  const projectRoot = path.join(__dirname, '..');
  
  // iOS destination (note: folder is 'Finly' with capital F)
  const iosDest = path.join(projectRoot, 'ios', 'Finly', 'Images.xcassets', 'AppIcon.appiconset');
  
  // Android destination base
  const androidDestBase = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
  
  // Ensure destination directories exist
  if (!fs.existsSync(iosDest)) {
    await mkdir(iosDest, { recursive: true });
  }
  
  if (!fs.existsSync(androidDestBase)) {
    await mkdir(androidDestBase, { recursive: true });
  }
  
  // Copy iOS icons
  const iosSourceDir = path.join(outputDir, 'ios');
  if (fs.existsSync(iosSourceDir)) {
    const iosFiles = await readdir(iosSourceDir);
    for (const file of iosFiles) {
      const sourcePath = path.join(iosSourceDir, file);
      const destPath = path.join(iosDest, file);
      
      // Check if it's a file (not a directory)
      const stats = await stat(sourcePath);
      if (stats.isFile()) {
        await copyFile(sourcePath, destPath);
      }
    }
  }
  
  // Copy Android icons
  const androidSourceDir = path.join(outputDir, 'android');
  if (fs.existsSync(androidSourceDir)) {
    const mipmapDirs = await readdir(androidSourceDir);
    
    for (const mipmapDir of mipmapDirs) {
      const mipmapPath = path.join(androidSourceDir, mipmapDir);
      const mipmapStats = await stat(mipmapPath);
      
      if (mipmapStats.isDirectory() && mipmapDir.startsWith('mipmap-')) {
        const destMipmapDir = path.join(androidDestBase, mipmapDir);
        
        // Ensure destination mipmap directory exists
        if (!fs.existsSync(destMipmapDir)) {
          await mkdir(destMipmapDir, { recursive: true });
        }
        
        // Copy all files in this mipmap directory
        const files = await readdir(mipmapPath);
        for (const file of files) {
          const sourcePath = path.join(mipmapPath, file);
          const destPath = path.join(destMipmapDir, file);
          
          const fileStats = await stat(sourcePath);
          if (fileStats.isFile()) {
            await copyFile(sourcePath, destPath);
          }
        }
      }
    }
  }
}

generateIcons().catch((error) => {
  console.error('❌ Error generating icons:', error);
  process.exit(1);
});

