import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import * as Network from 'expo-network';
import { AppState, Platform } from 'react-native';

import { ApiError } from './client';

// En ligne / hors ligne selon le réseau de l'appareil
onlineManager.setEventListener((setOnline) => {
  Network.getNetworkStateAsync()
    .then((state) => setOnline(!!state.isConnected))
    .catch(() => setOnline(true));
  const subscription = Network.addNetworkStateListener((state) => setOnline(!!state.isConnected));
  return () => subscription.remove();
});

// Premier plan = « focus » : les requêtes se rafraîchissent au retour de l'arrière-plan
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (status) => {
    if (Platform.OS !== 'web') handleFocus(status === 'active');
  });
  return () => subscription.remove();
});

const isClientError = (error: unknown) => error instanceof ApiError && error.status >= 400 && error.status < 500;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: (failureCount, error) => !isClientError(error) && failureCount < 2 },
    mutations: { retry: false },
  },
});
