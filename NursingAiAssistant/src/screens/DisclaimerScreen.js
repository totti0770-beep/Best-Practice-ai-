/**
 * src/screens/DisclaimerScreen.js
 *
 * Blocking clinical safety disclaimer shown before the app is usable.
 *
 * Behaviour:
 *   - Presented as the initial route on first launch (see App.js)
 *   - The acknowledge button stays disabled until the user has scrolled
 *     to the end of the notice
 *   - Acceptance is persisted in AppSettings and written to the audit log,
 *     then the user is sent to Home via navigation.replace (no way back)
 *
 * The DISCLAIMER_KEY carries a version suffix so that revising the wording
 * later can re-prompt every user by bumping it.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { setSetting } from '../database/db';
import { addAuditLog } from '../services/auditService';
import { COLORS } from '../styles/colors';
import { getFontFamily } from '../styles/typography';

export const DISCLAIMER_KEY = 'disclaimer_accepted_v1';

// Safety cards — icon and accent per point
const CARDS = [
  { titleKey: 'disclaimer.card1Title', bodyKey: 'disclaimer.card1Body', icon: 'account-alert-outline', color: COLORS.warning },
  { titleKey: 'disclaimer.card2Title', bodyKey: 'disclaimer.card2Body', icon: 'file-document-outline', color: COLORS.accentBlue },
  { titleKey: 'disclaimer.card3Title', bodyKey: 'disclaimer.card3Body', icon: 'alarm-light-outline',   color: COLORS.error },
  { titleKey: 'disclaimer.card4Title', bodyKey: 'disclaimer.card4Body', icon: 'calendar-clock',        color: COLORS.accentIndigo },
];

// Pixel tolerance when deciding whether the user reached the bottom
const SCROLL_END_THRESHOLD = 24;

export default function DisclaimerScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const isRTL = I18nManager.isRTL;

  const [hasReadToEnd, setHasReadToEnd] = useState(false);
  const [saving, setSaving] = useState(false);

  function handleScroll({ nativeEvent }) {
    if (hasReadToEnd) {
      return;
    }

    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const reachedEnd =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - SCROLL_END_THRESHOLD;

    if (reachedEnd) {
      setHasReadToEnd(true);
    }
  }

  async function handleAcknowledge() {
    if (!hasReadToEnd || saving) {
      return;
    }
    setSaving(true);

    const acceptedAt = new Date().toISOString();
    try {
      await setSetting(DISCLAIMER_KEY, acceptedAt);
      await addAuditLog(
        'DISCLAIMER_ACCEPTED',
        `Clinical safety disclaimer acknowledged (locale=${i18n.language})`
      );
    } catch (err) {
      // Never trap the user behind a storage failure — the acceptance is
      // logged best-effort and they may have to acknowledge again next launch.
      console.error('[Disclaimer] Failed to persist acceptance:', err);
    } finally {
      setSaving(false);
      navigation.replace('Home');
    }
  }

  const textAlign = isRTL ? 'right' : 'left';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator
      >
        {/* ── Header ── */}
        <View style={styles.hero}>
          <View style={styles.shield}>
            <Icon name="shield-check-outline" size={34} color="#FFF" />
          </View>
          <Text style={styles.appName}>{t('appName')}</Text>
          <Text style={styles.title}>{t('disclaimer.title')}</Text>
          <Text style={styles.subtitle}>{t('disclaimer.subtitle')}</Text>
        </View>

        {/* ── Amber banner ── */}
        <View style={[styles.banner, isRTL && styles.rowReverse]}>
          <Icon name="alert-outline" size={22} color={COLORS.warning} />
          <View style={[styles.bannerText, isRTL ? styles.gapRTL : styles.gapLTR]}>
            <Text style={[styles.bannerTitle, { textAlign }]}>
              {t('disclaimer.bannerTitle')}
            </Text>
            <Text style={[styles.bannerBody, { textAlign }]}>
              {t('disclaimer.bannerBody')}
            </Text>
          </View>
        </View>

        {/* ── Safety cards ── */}
        {CARDS.map(card => (
          <View
            key={card.titleKey}
            style={[
              styles.card,
              isRTL ? styles.cardAccentRTL : styles.cardAccentLTR,
              isRTL
                ? { borderRightColor: card.color }
                : { borderLeftColor: card.color },
            ]}
          >
            <View style={[styles.cardInner, isRTL && styles.rowReverse]}>
              <Icon name={card.icon} size={24} color={card.color} />
              <View style={[styles.cardText, isRTL ? styles.gapRTL : styles.gapLTR]}>
                <Text style={[styles.cardTitle, { textAlign }]}>{t(card.titleKey)}</Text>
                <Text style={[styles.cardBody, { textAlign }]}>{t(card.bodyKey)}</Text>
              </View>
            </View>
          </View>
        ))}

        <Text style={[styles.footer, { textAlign }]}>{t('disclaimer.footer')}</Text>
      </ScrollView>

      {/* ── Acknowledge bar ── */}
      <View style={styles.actionBar}>
        {!hasReadToEnd && (
          <View style={[styles.hintRow, isRTL && styles.rowReverse]}>
            <Icon name="arrow-down" size={14} color={COLORS.textMuted} />
            <Text style={[styles.hintText, isRTL ? styles.gapRTLSmall : styles.gapLTRSmall]}>
              {t('disclaimer.scrollHint')}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, !hasReadToEnd && styles.buttonDisabled]}
          onPress={handleAcknowledge}
          disabled={!hasReadToEnd || saving}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityState={{ disabled: !hasReadToEnd || saving }}
          accessibilityLabel={t('disclaimer.acknowledge')}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>{t('disclaimer.acknowledge')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    padding: 20,
    paddingBottom: 30,
  },
  rowReverse: { flexDirection: 'row-reverse' },
  gapLTR: { marginLeft: 12 },
  gapRTL: { marginRight: 12 },
  gapLTRSmall: { marginLeft: 6 },
  gapRTLSmall: { marginRight: 6 },

  // Header
  hero: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 24,
  },
  shield: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.accentBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  appName: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontFamily: getFontFamily('Regular'),
  },
  title: {
    fontSize: 23,
    color: COLORS.textWhite,
    fontFamily: getFontFamily('Bold'),
    textAlign: 'center',
    marginTop: 6,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: getFontFamily('Regular'),
    textAlign: 'center',
    marginTop: 6,
  },

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.warning,
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
  },
  bannerText: { flex: 1 },
  bannerTitle: {
    fontSize: 14,
    color: COLORS.warning,
    fontFamily: getFontFamily('Bold'),
  },
  bannerBody: {
    fontSize: 13,
    color: COLORS.textWhite,
    fontFamily: getFontFamily('Regular'),
    lineHeight: 20,
    marginTop: 4,
  },

  // Cards
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardAccentLTR: { borderLeftWidth: 4 },
  cardAccentRTL: { borderRightWidth: 4 },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    color: COLORS.textWhite,
    fontFamily: getFontFamily('Bold'),
  },
  cardBody: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: getFontFamily('Regular'),
    lineHeight: 20,
    marginTop: 4,
  },

  footer: {
    fontSize: 12,
    color: COLORS.textDim,
    fontFamily: getFontFamily('Regular'),
    lineHeight: 19,
    marginTop: 14,
  },

  // Action bar
  actionBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  hintText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontFamily: getFontFamily('Regular'),
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 15,
    color: '#FFF',
    fontFamily: getFontFamily('Bold'),
  },
});
