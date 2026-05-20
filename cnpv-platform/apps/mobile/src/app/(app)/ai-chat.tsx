import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { api } from '../../lib/api-client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  noSourceFlag?: boolean;
  citations?: Array<{ titleAr: string; pageNumber: number }>;
}

export default function AiChatScreen() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const ensureSession = async (): Promise<string> => {
    if (sessionId) return sessionId;
    const { data } = await api.post('/ai/sessions');
    const id = (data.data ?? data).id;
    setSessionId(id);
    return id;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput('');
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const sid = await ensureSession();
      const { data } = await api.post(`/ai/sessions/${sid}/ask`, { question });
      const result = data.data ?? data;
      const answer = result.answer;

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: answer.noSourceFlag
          ? 'لا توجد وثيقة معتمدة كافية للإجابة. الرجاء الرجوع للمسؤول المختص.'
          : answer.answerShort,
        noSourceFlag: answer.noSourceFlag,
        citations: answer.citations,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'assistant', content: 'حدث خطأ، يرجى المحاولة مرة أخرى.' },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🤖 المساعد التمريضي</Text>
        <Text style={styles.headerSub}>إجابات موثقة من وثائق معتمدة فقط</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={[styles.bubbleText, item.role === 'user' ? styles.userText : styles.aiText]}>
              {item.content}
            </Text>
            {item.citations && item.citations.length > 0 && (
              <View style={styles.citations}>
                {item.citations.map((c, i) => (
                  <Text key={i} style={styles.citationText}>
                    📄 {c.titleAr} — ص {c.pageNumber}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>اسأل عن دواء، جرعة، أو سياسة تمريضية</Text>
          </View>
        }
      />

      {loading && (
        <View style={styles.typingRow}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.typingText}>جارٍ البحث في الوثائق...</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendIcon}>↑</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="اكتب سؤالك هنا..."
          textAlign="right"
          multiline
          maxLength={500}
          onSubmitEditing={sendMessage}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#2563eb' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', textAlign: 'right' },
  headerSub: { fontSize: 12, color: '#bfdbfe', textAlign: 'right', marginTop: 2 },
  listContent: { padding: 16, paddingBottom: 8 },
  bubble: { maxWidth: '85%', borderRadius: 16, padding: 12, marginBottom: 10 },
  userBubble: { backgroundColor: '#2563eb', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  bubbleText: { fontSize: 14, lineHeight: 22 },
  userText: { color: '#fff', textAlign: 'right' },
  aiText: { color: '#1e293b', textAlign: 'right' },
  citations: { marginTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 6 },
  citationText: { fontSize: 11, color: '#64748b', textAlign: 'right', marginBottom: 2 },
  empty: { flex: 1, alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
  typingRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 4, gap: 8 },
  typingText: { fontSize: 12, color: '#94a3b8' },
  inputRow: { flexDirection: 'row-reverse', alignItems: 'flex-end', padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, backgroundColor: '#f8fafc', maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
  sendDisabled: { backgroundColor: '#93c5fd' },
  sendIcon: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
