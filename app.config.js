/**
 * Expo App Configuration
 * Single source of truth for environment variables via .env files
 * 
 * Environment loading order:
 * 1. .env (base)
 * 2. .env.{EXPO_PUBLIC_ENV} (environment-specific override)
 * 
 * Usage:
 * - Development: EXPO_PUBLIC_ENV=development (or default)
 * - Staging: EXPO_PUBLIC_ENV=staging
 * - Production: EXPO_PUBLIC_ENV=production
 */

// Load environment variables based on NODE_ENV or EXPO_PUBLIC_ENV
const env = process.env.EXPO_PUBLIC_ENV || process.env.NODE_ENV || 'development';

// Load .env file, then try .env.{environment} if it exists
require('dotenv').config();
require('dotenv').config({ path: `.env.${env}` });

/**
 * Extract hostname/IP from API URL for iOS App Transport Security
 * ATS requires explicit exception domains for HTTP connections
 */
const getATSHostname = (apiUrl) => {
  if (!apiUrl) return null;
  try {
    const url = new URL(apiUrl);
    return url.hostname;
  } catch (error) {
    // If URL parsing fails, try to extract IP/hostname manually
    const match = apiUrl.match(/https?:\/\/([^/:]+)/);
    return match ? match[1] : null;
  }
};

module.exports = ({ config }) => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const atsHostname = getATSHostname(apiUrl);

  if (!apiUrl) {
    console.warn(`[app.config.js] EXPO_PUBLIC_API_URL not set for environment: ${env}`);
  } else {
    console.log(`[app.config.js] Using API URL for ${env}: ${apiUrl}`);
    if (atsHostname && atsHostname !== 'localhost' && !atsHostname.includes('.')) {
      console.warn(`[app.config.js] Warning: Could not extract hostname from API URL: ${apiUrl}`);
    }
  }

  // Build iOS ATS exception domains dynamically
  const iosATSDomains = {
    localhost: {
      NSExceptionAllowsInsecureHTTPLoads: true,
      NSIncludesSubdomains: true,
    },
  };

  // Add API hostname to ATS exceptions if it's not localhost and not HTTPS
  if (atsHostname && atsHostname !== 'localhost' && apiUrl?.startsWith('http://')) {
    iosATSDomains[atsHostname] = {
      NSExceptionAllowsInsecureHTTPLoads: true,
      NSExceptionRequiresForwardSecrecy: false,
    };
  }

  // Safely merge config with defaults
  const existingExpo = config?.expo || {};
  const existingIOS = existingExpo.ios || {};
  const existingInfoPlist = existingIOS.infoPlist || {};

  return {
    ...config,
    expo: {
      ...existingExpo,
      extra: {
        ...existingExpo.extra,
        env,
        apiUrl,
      },
      ios: {
        ...existingIOS,
        infoPlist: {
          ...existingInfoPlist,
          NSAppTransportSecurity: {
            NSAllowsLocalNetworking: true,
            NSExceptionDomains: iosATSDomains,
          },
        },
      },
    },
  };
};

