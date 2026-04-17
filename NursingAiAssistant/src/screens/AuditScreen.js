/**
 * src/screens/AuditScreen.js
 *
 * Read-only view of the AuditLogs table.
 *
 * Displays the 100 most recent audit entries (newest first) including:
 *   - Action type (query success, rejection, upload, error)
 *   - Details string
 *   - Timestamp
 *
 * Used by the Admin to verify the integrity and usage of the knowledge base.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { getLogs } from '../services/auditService';
import { COLORS } from '../styles/colors';
import { getFontFamily } from '../styles/typography';

// Map action names to icons for quick visual scanning
const ACTION_ICONS = {
  AI_QUERY_SUCCESS:  { name: 'check-circle-outline', color: COLORS.success },
  AI_QUERY_REJECTED: { name: 'alert-circle-outline',  color: COLORS.warning },
  AI_QUERY_ERROR:    { name: 'close-circle-outline',  color: COLORS.error },
  PDF_UPLOAD:        { name: 'upload-outline',         color: COLORS.accentBlue },
  PDF_UPLOAD_ERROR:  { name: 'file-alert-outline',     color: COLORS.error },
  DEFAULT:           { name: 'information-outline',    color: COLORS.textMuted },
};

function getActionIcon(action) {
  return ACTION_ICONS[action] || ACTION_ICONS.DEFAULT;
}

export default function AuditScreen({ navigation }) {
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLogs()
      .then(setLogs)
      .catch(err => console.error('[Audit] Load failed:', err))
      .finally(() => setLoading(false));
  }, []);

  function renderEntry({ item }) {
    const { name: iconName, color: iconColor } = getActionIcon(item.action);
    return (
      <View style={[styles.card, isRTL && styles.rowReverse]}>
        <Icon name={iconName} size={22} color={iconColor} style={styles.cardIcon} />
        <View style={[styles.cardBody, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={styles.action}>{item.action}</Text>
          {item.details ? (
            <Text style={[styles.details, { textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={3}>
              {item.details}
            </Text>
          ) : null}
          <Text style={styles.ts}>{item.timestamp}</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={[styles.header, isRTL && styles.rowReverse]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon
            name={isRTL ? 'arrow-right' : 'arrow-left'}
            size={24}
            color={COLORS.textWhite}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('audit.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accentBlue} />
        </View>
      ) : (
        <FlatList
          data={logs}
          renderItem={renderEntry}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.empty, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('audit.empty')}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowReverse: { flexDirection: 'row-reverse' },
  backBtn: { width: 40, alignItems: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textWhite,
    fontFamily: getFontFamily('Bold'),
    fontSize: 17,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 40 },
  empty: {
    color: COLORS.textMuted,
    fontFamily: getFontFamily('Regular'),
    fontSize: 14,
    marginTop: 30,
    paddingHorizontal: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardIcon: { marginTop: 2, marginRight: 12 },
  cardBody: { flex: 1 },
  action: {
    color: COLORS.textWhite,
    fontFamily: getFontFamily('Bold'),
    fontSize: 13,
    marginBottom: 4,
  },
  details: {
    color: COLORS.textMuted,
    fontFamily: getFontFamily('Regular'),
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 6,
  },
  ts: {
    color: COLORS.textDim,
    fontFamily: getFontFamily('Regular'),
    fontSize: 11,
  },
});
