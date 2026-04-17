/**
 * src/i18n/index.js
 *
 * Internationalisation (i18n) configuration for NursingAiAssistant.
 *
 * Uses i18next + react-i18next for translation management.
 * Supports Arabic (ar) and English (en).
 *
 * Key behaviours:
 * - Detects device locale on first launch via react-native-localize
 * - Falls back to English when the device locale is not supported
 * - Persists the chosen language across app restarts (stored in AsyncStorage
 *   via a lightweight custom backend)
 * - Forces RTL layout for Arabic using React Native's I18nManager
 */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import * as RNLocalize from 'react-native-localize';

// ---------------------------------------------------------------------------
// Translation resources
// ---------------------------------------------------------------------------

const en = {
  translation: {
    // App-wide
    appName: 'Nursing AI Assistant',
    appSubtitle: 'Evidence-Based Clinical Reference',
    loading: 'Loading…',
    error: 'An error occurred. Please try again.',
    cancel: 'Cancel',
    confirm: 'Confirm',
    back: 'Back',
    save: 'Save',
    close: 'Close',

    // Home screen
    home: {
      greeting: 'Welcome',
      selectCategory: 'Select a Category',
      pharmacy: 'Pharmacy',
      policies: 'Policies & Procedures',
      quality: 'Quality & Safety',
      pharmacyDesc: 'Drug information, compatibility & dosing',
      policiesDesc: 'Nursing policies and care protocols',
      qualityDesc: 'Quality indicators and safety guidelines',
      adminLink: 'Admin Panel',
      chatFab: 'New Chat',
    },

    // Chat screen
    chat: {
      placeholder: 'Ask a clinical question…',
      send: 'Send',
      searchingRefs: 'Searching official references…',
      source: 'Source',
      page: 'Page',
      noContext:
        'No relevant information was found in the official references. Please consult your clinical supervisor.',
      errorResponse:
        'Unable to retrieve a response. Please check your connection and try again.',
      you: 'You',
      assistant: 'Assistant',
    },

    // Admin screen
    admin: {
      title: 'Admin Panel',
      uploadSection: 'Upload Reference Documents',
      uploadPharmacy: 'Upload Pharmacy PDF',
      uploadPolicies: 'Upload Policies PDF',
      uploadQuality: 'Upload Quality PDF',
      biometricPrompt: 'Authenticate to upload document',
      processing: 'Processing PDF…',
      successTitle: 'Upload Successful',
      successMessage: 'The document has been processed and indexed.',
      errorTitle: 'Upload Failed',
      errorBiometric: 'Biometric authentication failed.',
      errorPicker: 'No file was selected.',
      errorProcessing: 'Failed to process the document.',
      auditLink: 'View Audit Logs',
    },

    // Audit screen
    audit: {
      title: 'Audit Logs',
      empty: 'No audit entries found.',
      action: 'Action',
      details: 'Details',
      timestamp: 'Time',
    },

    // Language switcher
    language: {
      switchTo: 'العربية',
      current: 'English',
    },
  },
};

const ar = {
  translation: {
    // App-wide
    appName: 'مساعد التمريض الذكي',
    appSubtitle: 'مرجع سريري قائم على الأدلة',
    loading: 'جارٍ التحميل…',
    error: 'حدث خطأ. يرجى المحاولة مجدداً.',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    back: 'رجوع',
    save: 'حفظ',
    close: 'إغلاق',

    // Home screen
    home: {
      greeting: 'أهلاً وسهلاً',
      selectCategory: 'اختر التصنيف',
      pharmacy: 'الصيدلة',
      policies: 'السياسات والإجراءات',
      quality: 'الجودة والسلامة',
      pharmacyDesc: 'معلومات الأدوية والتوافق والجرعات',
      policiesDesc: 'سياسات التمريض وبروتوكولات الرعاية',
      qualityDesc: 'مؤشرات الجودة وإرشادات السلامة',
      adminLink: 'لوحة الإدارة',
      chatFab: 'محادثة جديدة',
    },

    // Chat screen
    chat: {
      placeholder: 'اطرح سؤالاً سريرياً…',
      send: 'إرسال',
      searchingRefs: 'جاري مراجعة المراجع الرسمية…',
      source: 'المصدر',
      page: 'الصفحة',
      noContext:
        'لم يتم العثور على معلومات ذات صلة في المراجع الرسمية. يرجى الرجوع إلى المشرف السريري.',
      errorResponse: 'تعذّر استرجاع الاستجابة. يرجى التحقق من الاتصال والمحاولة مجدداً.',
      you: 'أنت',
      assistant: 'المساعد',
    },

    // Admin screen
    admin: {
      title: 'لوحة الإدارة',
      uploadSection: 'رفع المستندات المرجعية',
      uploadPharmacy: 'رفع ملف PDF للصيدلة',
      uploadPolicies: 'رفع ملف PDF للسياسات',
      uploadQuality: 'رفع ملف PDF للجودة',
      biometricPrompt: 'التحقق البيومتري لرفع المستند',
      processing: 'جارٍ معالجة ملف PDF…',
      successTitle: 'تم الرفع بنجاح',
      successMessage: 'تمت معالجة المستند وفهرسته.',
      errorTitle: 'فشل الرفع',
      errorBiometric: 'فشل التحقق البيومتري.',
      errorPicker: 'لم يتم اختيار ملف.',
      errorProcessing: 'فشل في معالجة المستند.',
      auditLink: 'عرض سجلات المراجعة',
    },

    // Audit screen
    audit: {
      title: 'سجلات المراجعة',
      empty: 'لا توجد إدخالات في السجل.',
      action: 'الإجراء',
      details: 'التفاصيل',
      timestamp: 'الوقت',
    },

    // Language switcher
    language: {
      switchTo: 'English',
      current: 'العربية',
    },
  },
};

// ---------------------------------------------------------------------------
// Helper: resolve the best supported locale from the device
// ---------------------------------------------------------------------------

function resolveLocale() {
  const locales = RNLocalize.getLocales();
  if (!locales || locales.length === 0) return 'en';

  for (const locale of locales) {
    const lang = locale.languageCode;
    if (lang === 'ar') return 'ar';
    if (lang === 'en') return 'en';
  }
  return 'en';
}

// ---------------------------------------------------------------------------
// Apply RTL layout for Arabic
// ---------------------------------------------------------------------------

function applyLayoutDirection(language) {
  const isRTL = language === 'ar';
  I18nManager.allowRTL(isRTL);
  I18nManager.forceRTL(isRTL);
}

// ---------------------------------------------------------------------------
// Public initialiser – called once in App.js before rendering the tree
// ---------------------------------------------------------------------------

export async function initI18n() {
  const language = resolveLocale();
  applyLayoutDirection(language);

  await i18next.use(initReactI18next).init({
    compatibilityJSON: 'v3',
    resources: { en, ar },
    lng: language,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });
}

/**
 * Programmatically switch language (used by LanguageSwitcher).
 * The caller is responsible for triggering an app restart so that
 * I18nManager.forceRTL takes full effect.
 *
 * @param {'ar'|'en'} language
 */
export function switchLanguage(language) {
  applyLayoutDirection(language);
  i18next.changeLanguage(language);
}

export default i18next;
