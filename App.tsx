import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { I18nProvider } from './src/i18n/I18nContext';
import { MapScreen } from './src/screens/MapScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <MapScreen />
        <StatusBar style="dark" />
      </I18nProvider>
    </SafeAreaProvider>
  );
}
