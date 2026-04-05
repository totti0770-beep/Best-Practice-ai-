/**
 * App.js
 *
 * Root entry point for the NursingAiAssistant application.
 *
 * Responsibilities:
 * - Initialises the encrypted SQLite database on first launch
 * - Initialises the i18n (internationalisation) system
 * - Sets up the React Navigation stack with all application screens
 * - Applies the global dark-mode theme via NavigationContainer
 * - Hides the native navigation header (screens manage their own headers)
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
  I18nManager,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { initI18n } from './src/i18n';
import { initDB } from './src/database/db';
import { COLORS } from './src/styles/colors';

import HomeScreen from './src/screens/HomeScreen';
import ChatScreen from './src/screens/ChatScreen';
import AdminScreen from './src/screens/AdminScreen';
import AuditScreen from './src/screens/AuditScreen';

const Stack = createStackNavigator();

/**
 * Dark navigation theme applied to NavigationContainer so that
 * the system-level background and card colours match our palette.
 */
const darkTheme = {
  dark: true,
  colors: {
    primary: COLORS.primary,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.textWhite,
    border: COLORS.border,
    notification: COLORS.accentBlue,
  },
};

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        // 1. Set up translations and RTL before rendering anything
        await initI18n();

        // 2. Open / create the encrypted SQLite database and seed categories
        await initDB();
      } catch (err) {
        // Non-fatal during development — log and continue so the app is still
        // usable even when the device cannot initialise the database.
        console.error('[App] Bootstrap error:', err);
      } finally {
        setReady(true);
      }
    }

    bootstrap();
  }, []);

  if (!ready) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.accentBlue} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.background}
        />
        <NavigationContainer theme={darkTheme}>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerShown: false,
              cardStyle: { backgroundColor: COLORS.background },
              // Respect RTL for slide animations
              gestureDirection: I18nManager.isRTL ? 'horizontal-inverted' : 'horizontal',
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen name="Audit" component={AuditScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
