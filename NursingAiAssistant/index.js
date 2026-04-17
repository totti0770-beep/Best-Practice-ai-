/**
 * index.js
 *
 * React Native application entry point.
 * Registers the root App component with the native app registry.
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
