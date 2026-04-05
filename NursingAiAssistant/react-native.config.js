/**
 * react-native.config.js
 *
 * React Native CLI configuration file.
 * Links custom fonts (Tajawal for Arabic, Inter for English) and
 * other static assets so they are available to the native layer.
 *
 * After adding new fonts, run:
 *   npx react-native-asset
 * or re-run the build to auto-link assets.
 */

module.exports = {
  project: {
    android: {},
    ios: {},
  },
  assets: [
    // Arabic font: Tajawal (supports Arabic script with high readability)
    './src/assets/fonts/Tajawal/',
    // English font: Inter (modern, readable Latin-script font)
    './src/assets/fonts/Inter/',
  ],
};
