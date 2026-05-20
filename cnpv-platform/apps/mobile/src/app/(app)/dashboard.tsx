import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../lib/auth-store';

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const actions = [
    { label: '🤖 المساعد الذكي', route: '/(app)/ai-chat', color: '#2563eb' },
    { label: '💊 حاسبة الجرعات', route: '/(app)/dose-calculator', color: '#16a34a' },
    { label: '📋 الوثائق', route: '/(app)/policies', color: '#7c3aed' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.greeting}>أهلاً، {user?.fullNameAr} 👋</Text>
        <Text style={styles.subtitle}>منصة CNPV — حوكمة المعرفة</Text>
      </View>

      <View style={styles.grid}>
        {actions.map((a) => (
          <TouchableOpacity
            key={a.route}
            onPress={() => router.push(a.route as any)}
            style={[styles.card, { borderTopColor: a.color }]}
          >
            <Text style={styles.cardLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  header: { marginBottom: 24, paddingTop: 60 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', textAlign: 'right' },
  subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'right', marginTop: 4 },
  grid: { gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, borderTopWidth: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardLabel: { fontSize: 16, fontWeight: '600', color: '#334155', textAlign: 'right' },
});
