// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/**
 * Metro bundler configuration for Finly React Native app
 * Purpose: Configures the Metro bundler with Expo defaults
 */
const config = getDefaultConfig(__dirname);

module.exports = config;

