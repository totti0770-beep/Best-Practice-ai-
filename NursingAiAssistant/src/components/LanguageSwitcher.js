/**
 * src/components/LanguageSwitcher.js
 *
 * A small button that toggles between Arabic (RTL) and English (LTR).
 *
 * After switching, the app must restart so that I18nManager.forceRTL
 * takes effect at the native layout level — react-native-restart handles this.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { I18nManager } from 'react-native';
import RNRestart from 'react-native-restart';
import { useTranslation } from 'react-i18next';

import { switchLanguage } from '../i18n';
import { COLORS } from '../styles/colors';
import { getFontFamily } from '../styles/typography';

export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation();

  function handleToggle() {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    switchLanguage(newLang);
    // Restart required for I18nManager.forceRTL to fully apply on Android/iOS
    RNRestart.Restart();
  }

  return (
    <TouchableOpacity style={styles.btn} onPress={handleToggle} accessibilityRole="button">
      <Text style={styles.label}>{t('language.switchTo')}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    color: COLORS.accentBlue,
    fontSize: 13,
    fontFamily: getFontFamily('Bold'),
  },
});
