import { screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { clearToken } from '@/api/session';
import { fr } from '@/i18n/fr';
import { API, json, mockApi, renderWithProviders, testConfig, testFullProject } from '@/test/utils';

import { NewProjectScreen } from './NewProjectScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), setParams: jest.fn() } }));

beforeEach(async () => {
  process.env.EXPO_PUBLIC_API_URL = API;
  await clearToken();
  jest.clearAllMocks();
});

function bodyOf(call: { init: RequestInit }) {
  return JSON.parse(call.init.body as string);
}

test('crée le brouillon avec le brief choisi puis ouvre le projet qui lance l’agent Idées', async () => {
  const { calls } = mockApi({
    'GET /config/': () => json(200, testConfig),
    'POST /projects/': () => json(201, testFullProject('draft', { id: 'nouveau' })),
  });
  await renderWithProviders(<NewProjectScreen />);
  const user = userEvent.setup();

  await user.type(await screen.findByLabelText(fr.brief.theme), '  Finance personnelle ');
  await user.press(screen.getByRole('radio', { name: fr.brief.networkOption('YouTube', '16:9') }));
  await user.press(screen.getByRole('radio', { name: fr.brief.durationOption(60) }));
  await user.press(screen.getByRole('button', { name: fr.brief.submit }));

  const post = calls.find((call) => call.method === 'POST')!;
  expect(bodyOf(post)).toEqual({ theme: 'Finance personnelle', network: 'youtube', duration_seconds: 60 });
  expect(router.replace).toHaveBeenCalledWith({ pathname: '/project/[id]', params: { id: 'nouveau', generate: '1' } });
});

test('rg1 sujet trop court : message sous le champ, aucun appel', async () => {
  const { calls } = mockApi({ 'GET /config/': () => json(200, testConfig) });
  await renderWithProviders(<NewProjectScreen />);
  const user = userEvent.setup();

  await user.type(await screen.findByLabelText(fr.brief.theme), 'ab');
  await user.press(screen.getByRole('button', { name: fr.brief.submit }));

  expect(screen.getByText(fr.brief.themeTooShort(3))).toBeOnTheScreen();
  expect(calls.filter((call) => call.method === 'POST')).toHaveLength(0);
});

test('une suggestion remplit le sujet', async () => {
  mockApi({ 'GET /config/': () => json(200, testConfig) });
  await renderWithProviders(<NewProjectScreen />);

  await userEvent.setup().press(await screen.findByRole('button', { name: fr.brief.useSuggestion('Épargner sans se priver') }));

  expect(screen.getByLabelText(fr.brief.theme)).toHaveDisplayValue('Épargner sans se priver');
});

test('erreur de validation du serveur affichée sous le sujet', async () => {
  mockApi({
    'GET /config/': () => json(200, testConfig),
    'POST /projects/': () =>
      json(400, { detail: 'Les données envoyées sont invalides.', code: 'VALIDATION_ERROR', fields: { theme: ['Sujet refusé.'] } }),
  });
  await renderWithProviders(<NewProjectScreen />);
  const user = userEvent.setup();

  await user.type(await screen.findByLabelText(fr.brief.theme), 'Un sujet');
  await user.press(screen.getByRole('button', { name: fr.brief.submit }));

  expect(await screen.findByText('Sujet refusé.')).toBeOnTheScreen();
  expect(router.replace).not.toHaveBeenCalled();
});

test('quota atteint : message du serveur', async () => {
  mockApi({
    'GET /config/': () => json(200, testConfig),
    'POST /projects/': () => json(429, { detail: 'Limite d’utilisation atteinte pour aujourd’hui.', code: 'QUOTA_EXCEEDED' }),
  });
  await renderWithProviders(<NewProjectScreen />);
  const user = userEvent.setup();

  await user.type(await screen.findByLabelText(fr.brief.theme), 'Un sujet');
  await user.press(screen.getByRole('button', { name: fr.brief.submit }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Limite d’utilisation atteinte pour aujourd’hui.');
});

test('réglages indisponibles : erreur et « Réessayer »', async () => {
  mockApi({ 'GET /config/': () => json(503, { detail: 'Service indisponible.', code: 'ERROR' }) });

  await renderWithProviders(<NewProjectScreen />);

  expect(await screen.findByRole('alert')).toHaveTextContent('Service indisponible.');
  expect(screen.getByRole('button', { name: fr.common.retry })).toBeOnTheScreen();
});
