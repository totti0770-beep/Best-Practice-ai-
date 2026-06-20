/**
 * metro.config.js
 * Metro bundler configuration for React Native 0.73.
 *
 * Extends the default config so that .gguf model files inside the assets
 * folder are treated as assets (not parsed as JS) when Metro encounters them.
 */

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

const config = {
  resolver: {
    // Treat GGUF model files as assets so Metro does not attempt to parse them.
    assetExts: [...defaultConfig.resolver.assetExts, 'gguf', 'ttf', 'otf'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
