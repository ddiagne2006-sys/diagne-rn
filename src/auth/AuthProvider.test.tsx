import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, userEvent } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { Pressable, Text } from 'react-native';

import { api } from '@/api/client';
import { clearToken, getToken } from '@/api/session';
import { testQueryClient } from '@/test/utils';

import { AuthProvider, useAuth } from './AuthProvider';

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const fetchMock = jest.fn();
const USER = { id: 'u1', email: 'awa@example.com', full_name: 'Awa Diallo', role: 'creator' };

function json(status: number, body: unknown) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function Probe() {
  const { isLoading, isSignedIn, user, signOut } = useAuth();
  if (isLoading) return <Text>chargement</Text>;
  return (
    <>
      <Text>{isSignedIn ? `connecté : ${user?.email}` : 'déconnecté'}</Text>
      <Pressable accessibilityRole="button" onPress={signOut}>
        <Text>déconnexion</Text>
      </Pressable>
    </>
  );
}

async function renderProvider() {
  const client = testQueryClient();
  await render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

beforeEach(async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://192.168.1.20:8000/api';
  globalThis.fetch = fetchMock;
  fetchMock.mockReset();
  store.clear();
  await clearToken();
});

test('au démarrage sans jeton : déconnecté, aucun appel au serveur', async () => {
  await renderProvider();

  expect(await screen.findByText('déconnecté')).toBeOnTheScreen();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('au démarrage avec un jeton valide : vérifie /auth/me/ puis connecté', async () => {
  store.set('viral.token', 'jeton-123');
  fetchMock.mockResolvedValueOnce(json(200, USER));

  await renderProvider();

  expect(await screen.findByText('connecté : awa@example.com')).toBeOnTheScreen();
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('http://192.168.1.20:8000/api/auth/me/');
  expect((init.headers as Headers).get('Authorization')).toBe('Token jeton-123');
});

test('au démarrage avec un jeton expiré (401) : jeton effacé, déconnecté', async () => {
  store.set('viral.token', 'jeton-expire');
  fetchMock.mockResolvedValueOnce(json(401, { detail: 'Vous devez être connecté.', code: 'NOT_AUTHENTICATED' }));

  await renderProvider();

  expect(await screen.findByText('déconnecté')).toBeOnTheScreen();
  expect(store.has('viral.token')).toBe(false);
});

test('déconnexion : appelle /auth/token/logout/ et efface le jeton', async () => {
  store.set('viral.token', 'jeton-123');
  fetchMock.mockResolvedValueOnce(json(200, USER)).mockResolvedValueOnce(json(204, null));
  await renderProvider();
  await screen.findByText('connecté : awa@example.com');

  await userEvent.setup().press(screen.getByRole('button'));

  expect(await screen.findByText('déconnecté')).toBeOnTheScreen();
  expect(fetchMock.mock.calls[1][0]).toBe('http://192.168.1.20:8000/api/auth/token/logout/');
  expect(fetchMock.mock.calls[1][1].method).toBe('POST');
  expect(getToken()).toBeNull();
  expect(store.has('viral.token')).toBe(false);
});

test('déconnexion hors ligne : le jeton local est quand même effacé', async () => {
  store.set('viral.token', 'jeton-123');
  fetchMock.mockResolvedValueOnce(json(200, USER)).mockRejectedValueOnce(new TypeError('Network request failed'));
  await renderProvider();
  await screen.findByText('connecté : awa@example.com');

  await userEvent.setup().press(screen.getByRole('button'));

  expect(await screen.findByText('déconnecté')).toBeOnTheScreen();
  expect(store.has('viral.token')).toBe(false);
});

test('un 401 sur une requête ultérieure déconnecte', async () => {
  store.set('viral.token', 'jeton-123');
  fetchMock.mockResolvedValueOnce(json(200, USER)).mockResolvedValueOnce(json(401, { detail: 'x', code: 'NOT_AUTHENTICATED' }));
  await renderProvider();
  await screen.findByText('connecté : awa@example.com');

  await act(() => api('/projects/').catch(() => undefined));

  expect(await screen.findByText('déconnecté')).toBeOnTheScreen();
});
