import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

import App from './App';

/**
 * Application entry point
 * Purpose: Registers the root component with Expo
 * Note: This ensures proper setup whether running in Expo Go or a native build
 */
// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

