import 'react-native-url-polyfill/auto';
import * as WebBrowser from 'expo-web-browser';

// Call maybeCompleteAuthSession at the top of the app entry file
// to handle incoming OAuth redirects and deep links
WebBrowser.maybeCompleteAuthSession();

import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
