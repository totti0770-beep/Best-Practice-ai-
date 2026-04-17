/**
 * src/screens/ChatScreen.js
 *
 * Clinical chat interface for NursingAiAssistant.
 *
 * Features:
 *   - Bilingual message bubbles (Arabic / English) with RTL-aware layout
 *   - Source attribution footer on every bot message (PDF name + page number)
 *   - Loading indicator while the RAG engine searches references
 *   - Anti-hallucination warning styling for rejected responses
 *   - Keyboard-avoiding input bar
 *
 * Receives via route.params:
 *   categoryId   {number}  Knowledge domain (1 = Pharmacy, 2 = Policies, 3 = Quality)
 *   categoryName {string}  Display name shown in the header
 *   accentColor  {string}  Domain accent colour for header border
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';

import { generateSecureResponse } from '../services/aiEngine';
import { COLORS } from '../styles/colors';
import { getFontFamily } from '../styles/typography';

let nextId = 1;

function makeMessage(text, sender, source, page) {
  return {
    id: String(nextId++),
    text,
    sender,           // 'user' | 'bot'
    source: source || null,
    page:   page   || null,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    rejected: false,
  };
}

export default function ChatScreen({ route, navigation }) {
  const { categoryId, categoryName, accentColor = COLORS.accentBlue } = route.params;
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;

  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const listRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  async function handleSend() {
    const query = input.trim();
    if (!query || loading) return;

    setInput('');
    setMessages(prev => [...prev, makeMessage(query, 'user')]);
    setLoading(true);
    scrollToBottom();

    try {
      const result = await generateSecureResponse(query, categoryId);
      const bot = {
        ...makeMessage(result.answer, 'bot', result.source, result.page),
        rejected: result.rejected,
      };
      setMessages(prev => [...prev, bot]);
    } catch {
      setMessages(prev => [
        ...prev,
        makeMessage(t('chat.errorResponse'), 'bot'),
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  }

  function renderMessage({ item }) {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowBot]}>
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleBot,
            item.rejected && styles.bubbleRejected,
          ]}
        >
          <Text style={[styles.msgText, { textAlign: isRTL ? 'right' : 'left' }]}>
            {item.text}
          </Text>

          {/* Source attribution — only for bot messages with a known source */}
          {!isUser && item.source ? (
            <View style={styles.sourceWrap}>
              <View style={styles.sourceDivider} />
              <View style={[styles.sourceRow, isRTL && styles.rowReverse]}>
                <Icon name="file-pdf-box" size={14} color={COLORS.accentBlue} />
                <Text style={[styles.sourceText, { marginLeft: isRTL ? 0 : 5, marginRight: isRTL ? 5 : 0 }]}>
                  {t('chat.source')}: {item.source} · {t('chat.page')} {item.page}
                </Text>
              </View>
            </View>
          ) : null}

          <Text style={[styles.time, { textAlign: isUser ? (isRTL ? 'left' : 'right') : (isRTL ? 'right' : 'left') }]}>
            {item.time}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={[styles.header, { borderBottomColor: accentColor }, isRTL && styles.rowReverse]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon
            name={isRTL ? 'arrow-right' : 'arrow-left'}
            size={24}
            color={COLORS.textWhite}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{categoryName}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Messages ── */}
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={scrollToBottom}
        ListEmptyComponent={
          <Text style={[styles.emptyHint, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('chat.placeholder')}
          </Text>
        }
      />

      {/* ── Loading indicator ── */}
      {loading && (
        <View style={[styles.loadingRow, isRTL && styles.rowReverse]}>
          <ActivityIndicator size="small" color={COLORS.accentBlue} />
          <Text style={[styles.loadingText, { marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]}>
            {t('chat.searchingRefs')}
          </Text>
        </View>
      )}

      {/* ── Input bar ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.inputBar, isRTL && styles.rowReverse]}>
          <TextInput
            style={[styles.input, { textAlign: isRTL ? 'right' : 'left' }]}
            value={input}
            onChangeText={setInput}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={COLORS.textMuted}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={loading}
          >
            <Icon
              name="send"
              size={20}
              color="#FFF"
              style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    borderBottomWidth: 2,
  },
  rowReverse: { flexDirection: 'row-reverse' },
  backBtn: { width: 40, alignItems: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textWhite,
    fontFamily: getFontFamily('Bold'),
    fontSize: 16,
  },
  list: { padding: 14, paddingBottom: 8 },
  emptyHint: {
    color: COLORS.textMuted,
    fontFamily: getFontFamily('Regular'),
    fontSize: 14,
    marginTop: 40,
    paddingHorizontal: 20,
  },
  msgRow: { marginBottom: 12, flexDirection: 'row' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowBot:  { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 12,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 4,
  },
  bubbleRejected: {
    borderColor: COLORS.warning,
  },
  msgText: {
    color: COLORS.textWhite,
    fontFamily: getFontFamily('Regular'),
    fontSize: 15,
    lineHeight: 22,
  },
  sourceWrap: { marginTop: 8 },
  sourceDivider: { height: 1, backgroundColor: COLORS.border, marginBottom: 6 },
  sourceRow: { flexDirection: 'row', alignItems: 'center' },
  sourceText: {
    color: COLORS.accentBlue,
    fontFamily: getFontFamily('Bold'),
    fontSize: 11,
    flexShrink: 1,
  },
  time: {
    color: COLORS.textDim,
    fontSize: 10,
    marginTop: 6,
    fontFamily: getFontFamily('Regular'),
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontFamily: getFontFamily('Regular'),
    fontSize: 13,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    backgroundColor: COLORS.background,
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.textWhite,
    fontFamily: getFontFamily('Regular'),
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: { opacity: 0.5 },
});
