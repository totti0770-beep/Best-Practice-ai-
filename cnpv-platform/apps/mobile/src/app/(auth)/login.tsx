import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../lib/api-client';
import { useAuthStore } from '../../lib/auth-store';

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      const result = data.data ?? data;
      if (result.mfaPending) {
        Alert.alert('التحقق بخطوتين', 'يجب إكمال التحقق بخطوتين');
        return;
      }
      setAuth(result.user, result.accessToken, result.refreshToken);
      router.replace('/(app)/dashboard');
    } catch (err: any) {
      Alert.alert('خطأ', err.response?.data?.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>🏥</Text>
        </View>
        <Text style={styles.title}>منصة CNPV</Text>
        <Text style={styles.subtitle}>حوكمة المعرفة والقرار الموثوق</Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="البريد الإلكتروني"
          keyboardType="email-address"
          autoCapitalize="none"
          textAlign="right"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="كلمة المرور"
          secureTextEntry
          textAlign="right"
        />

        <TouchableOpacity
          style={[styles.button, (!email || !password || loading) && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={!email || !password || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>تسجيل الدخول</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eff6ff', padding: 24 },
  card: { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 20, padding: 28, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 20, elevation: 4 },
  logo: { width: 64, height: 64, backgroundColor: '#2563eb', borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 16, alignSelf: 'center' },
  logoText: { fontSize: 28 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 24, marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 12, backgroundColor: '#f8fafc' },
  button: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
