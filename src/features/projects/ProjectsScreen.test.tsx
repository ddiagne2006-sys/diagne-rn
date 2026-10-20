import { act, fireEvent, screen, userEvent } from '@testing-library/react-native';
import { router } from 'expo-router';

import { clearToken, saveToken } from '@/api/session';
import { fr } from '@/i18n/fr';
import { API, json, mockApi, page, renderWithProviders, testProject } from '@/test/utils';

import { ProjectsScreen, SEARCH_DEBOUNCE_MS } from './ProjectsScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn() } }));

const USER = { id: 'u1', email: 'awa@example.com', full_name: 'Awa Diallo', role: 'creator' };
const me = () => json(200, USER);

beforeEach(async () => {
  process.env.EXPO_PUBLIC_API_URL = API;
  await clearToken();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

test('affiche les projets du créateur avec le jeton', async () => {
  await saveToken('jeton-123');
  const { calls } = mockApi({
    'GET /auth/me/': me,
    'GET /projects/': () =>
      json(200, page([testProject(), testProject({ id: 'p2', title: 'Budget étudiant', network: 'youtube', status: 'draft' })])),
  });

  await renderWithProviders(<ProjectsScreen />);

  expect(await screen.findByText('Épargner 100 € par mois')).toBeOnTheScreen();
  expect(screen.getByText('Budget étudiant')).toBeOnTheScreen();
  expect(screen.getByText(fr.status.script_ready)).toBeOnTheScreen();
  expect(screen.getByText(fr.projects.count(2))).toBeOnTheScreen();
  const list = calls.find((call) => call.url.pathname === '/api/projects/')!;
  expect(list.url.searchParams.get('page')).toBe('1');
  expect((list.init.headers as Headers).get('Authorization')).toBe('Token jeton-123');
});

test('sans projet : message vide', async () => {
  mockApi({ 'GET /projects/': () => json(200, page([])) });

  await renderWithProviders(<ProjectsScreen />);

  expect(await screen.findByText(fr.projects.empty)).toBeOnTheScreen();
});

test('erreur : message du serveur puis « Réessayer » relance la requête', async () => {
  let attempts = 0;
  mockApi({
    'GET /projects/': () =>
      ++attempts === 1
        ? json(503, { detail: 'Service indisponible.', code: 'ERROR' })
        : json(200, page([testProject()])),
  });

  await renderWithProviders(<ProjectsScreen />);

  expect(await screen.findByRole('alert')).toHaveTextContent('Service indisponible.');
  await userEvent.setup().press(screen.getByRole('button', { name: fr.common.retry }));
  expect(await screen.findByText('Épargner 100 € par mois')).toBeOnTheScreen();
});

test('erreur réseau : texte en français, sans détail technique', async () => {
  mockApi({
    'GET /projects/': () => {
      throw new TypeError('Network request failed');
    },
  });

  await renderWithProviders(<ProjectsScreen />);

  expect(await screen.findByRole('alert')).toHaveTextContent(fr.errors.network);
});

test('la recherche interroge le serveur après une pause de frappe', async () => {
  jest.useFakeTimers();
  const { calls } = mockApi({
    'GET /projects/': (url) =>
      json(200, page(url.searchParams.get('search') ? [testProject({ id: 'p9', title: 'Budget étudiant' })] : [testProject()])),
  });
  await renderWithProviders(<ProjectsScreen />);
  await screen.findByText('Épargner 100 € par mois');

  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.type(screen.getByLabelText(fr.projects.search), 'budget');
  await act(() => jest.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));

  expect(await screen.findByText('Budget étudiant')).toBeOnTheScreen();
  const searches = calls.map((call) => call.url.searchParams.get('search')).filter(Boolean);
  expect(searches).toEqual(['budget']); // une seule requête pour la saisie entière
});

test('recherche sans résultat : message dédié', async () => {
  jest.useFakeTimers();
  mockApi({
    'GET /projects/': (url) => json(200, page(url.searchParams.get('search') ? [] : [testProject()])),
  });
  await renderWithProviders(<ProjectsScreen />);
  await screen.findByText('Épargner 100 € par mois');

  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  await user.type(screen.getByLabelText(fr.projects.search), 'zzz');
  await act(() => jest.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS));

  expect(await screen.findByText(fr.projects.noMatch('zzz'))).toBeOnTheScreen();
});

test('charge la page suivante en fin de liste', async () => {
  const { calls } = mockApi({
    'GET /projects/': (url) =>
      url.searchParams.get('page') === '1'
        ? json(200, page([testProject()], `${API}/projects/?page=2`, 2))
        : json(200, page([testProject({ id: 'p2', title: 'Deuxième page' })], null, 2)),
  });
  await renderWithProviders(<ProjectsScreen />);
  await screen.findByText('Épargner 100 € par mois');

  await act(async () => {
    fireEvent(screen.getByTestId('projects-list'), 'onEndReached');
  });

  expect(await screen.findByText('Deuxième page')).toBeOnTheScreen();
  expect(calls.map((call) => call.url.searchParams.get('page'))).toEqual(['1', '2']);
});

test('appuyer sur un projet ouvre son écran', async () => {
  mockApi({ 'GET /projects/': () => json(200, page([testProject({ id: 'abc' })])) });
  await renderWithProviders(<ProjectsScreen />);

  await userEvent.setup().press(await screen.findByRole('button', { name: fr.projects.open('Épargner 100 € par mois') }));

  expect(router.push).toHaveBeenCalledWith({ pathname: '/project/[id]', params: { id: 'abc' } });
});
