// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro bundler configuration for Finly React Native app
 * Purpose: Configures the Metro bundler with Expo defaults
 */
const config = getDefaultConfig(__dirname);

// Startup perf: inlineRequires defers module initialization until first use.
// This reduces initial JS work and improves time-to-interactive on cold start.
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;

