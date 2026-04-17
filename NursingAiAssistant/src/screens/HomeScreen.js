/**
 * src/screens/HomeScreen.js
 *
 * Main dashboard of NursingAiAssistant — the 3-tile home screen.
 *
 * Layout:
 *   - Header with app name and LanguageSwitcher
 *   - Three category tiles (Pharmacy, Policies, Quality)
 *   - Admin panel link at the bottom
 *   - Floating action button for quick chat
 *
 * All text is sourced from i18n keys. Tile layout is RTL-aware via
 * I18nManager.isRTL.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import LanguageSwitcher from '../components/LanguageSwitcher';
import { COLORS } from '../styles/colors';
import { getFontFamily } from '../styles/typography';

// Category tile config — icons and accent colours per domain
const CATEGORIES = [
  {
    id: 1,
    titleKey: 'home.pharmacy',
    descKey:  'home.pharmacyDesc',
    icon:     'pill',
    color:    COLORS.accentBlue,
  },
  {
    id: 2,
    titleKey: 'home.policies',
    descKey:  'home.policiesDesc',
    icon:     'file-document-edit-outline',
    color:    COLORS.accentIndigo,
  },
  {
    id: 3,
    titleKey: 'home.quality',
    descKey:  'home.qualityDesc',
    icon:     'shield-check-outline',
    color:    COLORS.accentDeep,
  },
];

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;

  function openChat(category) {
    navigation.navigate('Chat', {
      categoryId:   category.id,
      categoryName: t(category.titleKey),
      accentColor:  category.color,
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={[styles.header, isRTL && styles.rowReverse]}>
        <View style={isRTL ? styles.headerTextRTL : styles.headerTextLTR}>
          <Text style={styles.appName}>{t('appName')}</Text>
          <Text style={styles.appSubtitle}>{t('appSubtitle')}</Text>
        </View>
        <LanguageSwitcher />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('home.selectCategory')}
        </Text>

        {/* ── Tiles ── */}
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.tile,
              isRTL
                ? { borderRightWidth: 5, borderRightColor: cat.color }
                : { borderLeftWidth: 5, borderLeftColor: cat.color },
            ]}
            onPress={() => openChat(cat)}
            activeOpacity={0.75}
          >
            <View style={[styles.tileInner, isRTL && styles.rowReverse]}>
              <Icon name={cat.icon} size={38} color={cat.color} />
              <View style={[styles.tileText, isRTL ? styles.tileTextRTL : styles.tileTextLTR]}>
                <Text style={styles.tileTitle}>{t(cat.titleKey)}</Text>
                <Text style={styles.tileDesc}>{t(cat.descKey)}</Text>
              </View>
              <Icon
                name={isRTL ? 'chevron-left' : 'chevron-right'}
                size={22}
                color={COLORS.textDim}
              />
            </View>
          </TouchableOpacity>
        ))}

        {/* ── Admin link ── */}
        <TouchableOpacity
          style={[styles.adminLink, isRTL && styles.rowReverse]}
          onPress={() => navigation.navigate('Admin')}
        >
          <Icon name="lock-outline" size={16} color={COLORS.textMuted} />
          <Text style={[styles.adminText, { marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }]}>
            {t('home.adminLink')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[styles.fab, isRTL ? styles.fabRTL : styles.fabLTR]}
        onPress={() => navigation.navigate('Chat', {
          categoryId:   1,
          categoryName: t('home.pharmacy'),
          accentColor:  COLORS.accentBlue,
        })}
        accessibilityRole="button"
        accessibilityLabel={t('home.chatFab')}
      >
        <Icon name="robot-outline" size={28} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowReverse: { flexDirection: 'row-reverse' },
  headerTextLTR: { alignItems: 'flex-start' },
  headerTextRTL: { alignItems: 'flex-end' },
  appName: {
    fontSize: 20,
    color: COLORS.textWhite,
    fontFamily: getFontFamily('Bold'),
  },
  appSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: getFontFamily('Regular'),
    marginTop: 2,
  },
  scroll: {
    padding: 20,
    paddingBottom: 100,
  },
  sectionLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: getFontFamily('Regular'),
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  tile: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginBottom: 14,
    overflow: 'hidden',
    elevation: 3,
  },
  tileInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  tileText: { flex: 1 },
  tileTextLTR: { marginLeft: 14, alignItems: 'flex-start' },
  tileTextRTL: { marginRight: 14, alignItems: 'flex-end' },
  tileTitle: {
    fontSize: 17,
    color: COLORS.textWhite,
    fontFamily: getFontFamily('Bold'),
  },
  tileDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: getFontFamily('Regular'),
    marginTop: 3,
  },
  adminLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    opacity: 0.6,
  },
  adminText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: getFontFamily('Regular'),
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  fabLTR: { right: 24 },
  fabRTL: { left: 24 },
});
