/**
 * src/styles/typography.js
 *
 * Dynamic font helper for NursingAiAssistant.
 *
 * Returns the correct font family based on the currently active i18n language:
 *   Arabic  → Tajawal  (installed under src/assets/fonts/)
 *   English → Inter    (installed under src/assets/fonts/)
 *
 * Usage:
 *   import { getFontFamily } from '../styles/typography';
 *   style={{ fontFamily: getFontFamily('Bold') }}
 */

import i18next from '../i18n';

/**
 * @param {'Regular'|'Bold'} [weight='Regular']
 * @returns {string} React Native font family name
 */
export function getFontFamily(weight = 'Regular') {
  const isArabic = i18next.language === 'ar';

  if (isArabic) {
    return weight === 'Bold' ? 'Tajawal-Bold' : 'Tajawal-Regular';
  }
  return weight === 'Bold' ? 'Inter-Bold' : 'Inter-Regular';
}

/** Pre-built style objects for common text roles */
export const TEXT_STYLES = {
  h1: () => ({ fontSize: 26, fontFamily: getFontFamily('Bold') }),
  h2: () => ({ fontSize: 20, fontFamily: getFontFamily('Bold') }),
  body: () => ({ fontSize: 16, fontFamily: getFontFamily('Regular') }),
  small: () => ({ fontSize: 13, fontFamily: getFontFamily('Regular') }),
  caption: () => ({ fontSize: 11, fontFamily: getFontFamily('Regular') }),
};
