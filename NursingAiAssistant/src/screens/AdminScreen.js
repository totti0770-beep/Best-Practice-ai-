/**
 * src/screens/AdminScreen.js
 *
 * Biometric-protected admin panel for uploading official PDF reference documents.
 *
 * Workflow for each upload button:
 *   1. Prompt biometric authentication (fingerprint / face ID)
 *   2. Open the native document picker (PDF only)
 *   3. Pass the selected file to processSecurePDF for SHA-256 verification,
 *      text extraction, chunking, and storage in the encrypted SQLite DB
 *   4. Show a success or error alert
 *
 * Only the authorised administrator should have access to this screen.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ReactNativeBiometrics from 'react-native-biometrics';
import DocumentPicker from 'react-native-document-picker';
import { useTranslation } from 'react-i18next';

import { processSecurePDF } from '../services/pdfService';
import { COLORS } from '../styles/colors';
import { getFontFamily } from '../styles/typography';

const rnBiometrics = new ReactNativeBiometrics();

// Upload button configuration — one per knowledge domain
const UPLOAD_ACTIONS = [
  {
    categoryId: 1,
    titleKey:   'admin.uploadPharmacy',
    icon:       'pill',
    color:      COLORS.accentBlue,
  },
  {
    categoryId: 2,
    titleKey:   'admin.uploadPolicies',
    icon:       'file-document-edit-outline',
    color:      COLORS.accentIndigo,
  },
  {
    categoryId: 3,
    titleKey:   'admin.uploadQuality',
    icon:       'shield-check-outline',
    color:      COLORS.accentDeep,
  },
];

export default function AdminScreen({ navigation }) {
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const [processing, setProcessing] = useState(false);

  async function handleUpload(categoryId) {
    // Step 1: Biometric authentication
    let authResult;
    try {
      authResult = await rnBiometrics.simplePrompt({
        promptMessage: t('admin.biometricPrompt'),
        cancelButtonText: t('cancel'),
      });
    } catch {
      Alert.alert(t('admin.errorTitle'), t('admin.errorBiometric'));
      return;
    }

    if (!authResult.success) {
      Alert.alert(t('admin.errorTitle'), t('admin.errorBiometric'));
      return;
    }

    // Step 2: Pick a PDF file
    let picked;
    try {
      picked = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf],
        copyTo: 'cachesDirectory',
      });
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert(t('admin.errorTitle'), t('admin.errorPicker'));
      }
      return;
    }

    const file = picked[0];
    const fileUri  = file.fileCopyUri || file.uri;
    const fileName = file.name || 'document.pdf';

    // Step 3: Process and index the document
    setProcessing(true);
    try {
      const success = await processSecurePDF(fileUri, fileName, categoryId);
      setProcessing(false);

      if (success) {
        Alert.alert(t('admin.successTitle'), t('admin.successMessage'));
      } else {
        Alert.alert(t('admin.errorTitle'), t('admin.errorProcessing'));
      }
    } catch (err) {
      setProcessing(false);
      Alert.alert(t('admin.errorTitle'), err.message || t('admin.errorProcessing'));
    }
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
        <Text style={styles.headerTitle}>{t('admin.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.sectionLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('admin.uploadSection')}
        </Text>

        {/* ── Upload buttons ── */}
        {UPLOAD_ACTIONS.map(action => (
          <TouchableOpacity
            key={action.categoryId}
            style={[
              styles.uploadBtn,
              isRTL
                ? { borderRightWidth: 4, borderRightColor: action.color }
                : { borderLeftWidth: 4, borderLeftColor: action.color },
            ]}
            onPress={() => handleUpload(action.categoryId)}
            disabled={processing}
          >
            <View style={[styles.btnInner, isRTL && styles.rowReverse]}>
              <Icon name={action.icon} size={26} color={action.color} />
              <Text style={[
                styles.btnText,
                { marginLeft: isRTL ? 0 : 12, marginRight: isRTL ? 12 : 0 },
              ]}>
                {t(action.titleKey)}
              </Text>
              <Icon name="upload-outline" size={20} color={COLORS.textMuted} />
            </View>
          </TouchableOpacity>
        ))}

        {/* ── Processing indicator ── */}
        {processing && (
          <View style={styles.processingRow}>
            <ActivityIndicator size="small" color={COLORS.accentBlue} />
            <Text style={styles.processingText}>{t('admin.processing')}</Text>
          </View>
        )}

        {/* ── Audit logs link ── */}
        <TouchableOpacity
          style={[styles.auditLink, isRTL && styles.rowReverse]}
          onPress={() => navigation.navigate('Audit')}
        >
          <Icon name="clipboard-text-clock-outline" size={16} color={COLORS.textMuted} />
          <Text style={[styles.auditText, { marginLeft: isRTL ? 0 : 6, marginRight: isRTL ? 6 : 0 }]}>
            {t('admin.auditLink')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  sectionLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontFamily: getFontFamily('Regular'),
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 18,
  },
  uploadBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: 14,
    overflow: 'hidden',
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  btnText: {
    flex: 1,
    color: COLORS.textWhite,
    fontFamily: getFontFamily('Regular'),
    fontSize: 15,
  },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 10,
  },
  processingText: {
    color: COLORS.textMuted,
    fontFamily: getFontFamily('Regular'),
    fontSize: 14,
  },
  auditLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    opacity: 0.6,
  },
  auditText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontFamily: getFontFamily('Regular'),
  },
});
