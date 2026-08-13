import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../lib/auth-store';

export default function AppLayout() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    if (!isAuthenticated) router.replace('/(auth)/login');
  }, [isAuthenticated]);

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarLabelStyle: { fontSize: 11 } }}>
      <Tabs.Screen name="dashboard" options={{ title: 'الرئيسية', tabBarIcon: () => null }} />
      <Tabs.Screen name="ai-chat" options={{ title: 'المساعد', tabBarIcon: () => null }} />
      <Tabs.Screen name="dose-calculator" options={{ title: 'الجرعات', tabBarIcon: () => null }} />
      <Tabs.Screen name="policies" options={{ title: 'الوثائق', tabBarIcon: () => null }} />
    </Tabs>
  );
}
