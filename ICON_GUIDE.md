# Finly App Icon Guide

## Icon Design
The Finly app icon features a modern, clean design representing smart expense tracking:
- **Wallet/Card container** - Represents financial management
- **Checkmark** - Signifies smart tracking and verification
- **Gradient background** - Uses Finly's primary blue (#4A90E2)
- **Clean aesthetic** - Modern and professional

## Quick Setup

### Option 1: Using the Icon Generation Script (Recommended)

1. **Install dependencies:**
   ```bash
   npm install --save-dev sharp
   ```

2. **Generate icons:**
   ```bash
   npm run generate-icons
   ```

3. **Copy generated icons:**
   - **iOS:** Copy icons from `assets/generated-icons/ios/` to `ios/finly/Images.xcassets/AppIcon.appiconset/`
   - **Android:** Copy icons from `assets/generated-icons/android/mipmap-*/` to `android/app/src/main/res/mipmap-*/`

### Option 2: Using Online Tools

1. **Generate icons from SVG:**
   - Visit [AppIcon.co](https://www.appicon.co/) or [IconKitchen](https://icon.kitchen/)
   - Upload `assets/icon.svg`
   - Download iOS and Android icon sets
   - Extract and place in the appropriate directories

### Option 3: Manual Design

If you prefer to design your own icon:
- Use design tools like Figma, Sketch, or Adobe Illustrator
- Export at 1024x1024px for iOS
- Follow platform-specific guidelines:
  - **iOS:** [Apple Human Interface Guidelines - App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
  - **Android:** [Material Design - App Icons](https://material.io/design/iconography/app-icons.html)

## File Structure

```
finly-native/
├── assets/
│   └── icon.svg                    # Master SVG icon
├── scripts/
│   └── generate-icons.js          # Icon generation script
├── ios/
│   └── finly/
│       └── Images.xcassets/
│           └── AppIcon.appiconset/
│               ├── Contents.json   # iOS icon configuration
│               └── *.png          # iOS icon files
└── android/
    └── app/
        └── src/
            └── main/
                └── res/
                    └── mipmap-*/
                        ├── ic_launcher.png
                        └── ic_launcher_round.png
```

## Required Icon Sizes

### iOS
- 20x20 (@1x, @2x, @3x)
- 29x29 (@1x, @2x, @3x)
- 40x40 (@1x, @2x, @3x)
- 60x60 (@2x, @3x)
- 76x76 (@1x, @2x)
- 83.5x83.5 (@2x)
- 1024x1024 (@1x) - App Store

### Android
- 48x48 (mdpi)
- 72x72 (hdpi)
- 96x96 (xhdpi)
- 144x144 (xxhdpi)
- 192x192 (xxxhdpi)
- Plus round versions for each density

## Design Guidelines

### iOS
- Icons should be simple, recognizable, and memorable
- Avoid text, transparency, and too much detail
- Use a square format (corner radius will be applied automatically)
- Provide both regular and @2x/@3x versions

### Android
- Follow Material Design principles
- Provide both square (`ic_launcher.png`) and round (`ic_launcher_round.png`) versions
- Icons should be adaptive and work well on various backgrounds
- Use safe zones to ensure important content isn't clipped

## Testing

After generating and installing icons:

1. **iOS:**
   ```bash
   npm run ios
   ```
   Check that the icon appears correctly on the home screen and in Settings.

2. **Android:**
   ```bash
   npm run android
   ```
   Check that the icon appears correctly on the home screen and in the app drawer.

## Troubleshooting

- **Icons not updating:** Clean build folders and rebuild:
  - iOS: `cd ios && rm -rf build && cd ..`
  - Android: `cd android && ./gradlew clean && cd ..`

- **Icon generation fails:** Ensure `sharp` is installed and the SVG file exists at `assets/icon.svg`

- **Wrong colors:** Verify the SVG uses the correct color codes (#4A90E2 for primary)

## Customization

To customize the icon:
1. Edit `assets/icon.svg` in a vector graphics editor
2. Maintain the 1024x1024 viewBox
3. Keep important elements within the safe zone (avoid edges)
4. Regenerate icons using the script

