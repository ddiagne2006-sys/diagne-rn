import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, userEvent } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import { Text } from 'react-native';

import { clearToken } from '@/api/session';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { fr } from '@/i18n/fr';
import { testQueryClient } from '@/test/utils';

import { SignInScreen } from './SignInScreen';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));

const fetchMock = jest.fn();
const USER = { id: 'u1', email: 'awa@example.com', full_name: 'Awa Diallo', role: 'creator' };

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function SignedInProbe() {
  const { user } = useAuth();
  return user ? <Text>{`connecté : ${user.email}`}</Text> : null;
}

async function renderSignIn() {
  const client = testQueryClient();
  await render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <SignInScreen />
        <SignedInProbe />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

async function fillAndSubmit(email: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(fr.auth.email), email);
  await user.type(screen.getByLabelText(fr.auth.password), password);
  await user.press(screen.getByRole('button', { name: fr.auth.signIn }));
}

beforeEach(async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://192.168.1.20:8000/api';
  globalThis.fetch = fetchMock;
  fetchMock.mockReset();
  await clearToken();
  jest.clearAllMocks();
});

test('connexion réussie : jeton enregistré et utilisateur connecté', async () => {
  fetchMock.mockResolvedValueOnce(json(200, { token: 'jeton-123', user: USER }));
  await renderSignIn();

  await fillAndSubmit(' awa@example.com ', 'Mot-de-passe-solide-1');

  expect(await screen.findByText('connecté : awa@example.com')).toBeOnTheScreen();
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('http://192.168.1.20:8000/api/auth/token/');
  expect(JSON.parse(init.body)).toEqual({ email: 'awa@example.com', password: 'Mot-de-passe-solide-1' });
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('viral.token', 'jeton-123');
});

test('identifiants faux : message clair, aucun jeton enregistré', async () => {
  fetchMock.mockResolvedValueOnce(
    json(400, { detail: 'E-mail ou mot de passe incorrect.', code: 'INVALID_CREDENTIALS' }),
  );
  await renderSignIn();

  await fillAndSubmit('awa@example.com', 'mauvais');

  expect(await screen.findByRole('alert')).toHaveTextContent(fr.auth.invalidCredentials);
  expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: fr.auth.signIn })).toBeEnabled();
});

test('trop de tentatives (429) : message en français', async () => {
  fetchMock.mockResolvedValueOnce(
    json(429, { detail: 'Trop de requêtes. Réessayez dans un instant.', code: 'RATE_LIMITED' }),
  );
  await renderSignIn();

  await fillAndSubmit('awa@example.com', 'mauvais');

  expect(await screen.findByRole('alert')).toHaveTextContent(fr.auth.tooManyAttempts);
});

test('champs vides : erreurs sous les champs, aucun appel au serveur', async () => {
  await renderSignIn();

  await userEvent.setup().press(screen.getByRole('button', { name: fr.auth.signIn }));

  expect(await screen.findAllByText(fr.auth.required)).toHaveLength(2);
  expect(fetchMock).not.toHaveBeenCalled();
});

test('erreurs de validation du serveur affichées sous le champ concerné', async () => {
  fetchMock.mockResolvedValueOnce(
    json(400, {
      detail: 'Les données envoyées sont invalides.',
      code: 'VALIDATION_ERROR',
      fields: { email: ['Saisissez une adresse e-mail valide.'] },
    }),
  );
  await renderSignIn();

  await fillAndSubmit('pas-un-email', 'x');

  expect(await screen.findByText('Saisissez une adresse e-mail valide.')).toBeOnTheScreen();
  expect(screen.queryByRole('alert')).toBeNull();
});

test('bouton désactivé pendant l’envoi', async () => {
  let respond: (response: Response) => void = () => {};
  fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => (respond = resolve)));
  await renderSignIn();

  await fillAndSubmit('awa@example.com', 'Mot-de-passe-solide-1');

  const button = await screen.findByRole('button', { name: fr.auth.signingIn });
  expect(button).toBeDisabled();
  respond(json(200, { token: 'jeton-123', user: USER }));
  expect(await screen.findByText('connecté : awa@example.com')).toBeOnTheScreen();
});

test('erreur réseau : message explicite', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
  await renderSignIn();

  await fillAndSubmit('awa@example.com', 'Mot-de-passe-solide-1');

  expect(await screen.findByRole('alert')).toHaveTextContent(fr.errors.network);
});
