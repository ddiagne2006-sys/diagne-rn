import { act, screen, userEvent } from '@testing-library/react-native';
import { Alert, type AlertButton } from 'react-native';

import { clearToken } from '@/api/session';
import { fr } from '@/i18n/fr';
import { API, json, mockApi, renderWithProviders, testFullProject, testIdea } from '@/test/utils';

import { ProjectScreen, RUNNING_POLL_MS } from './ProjectScreen';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), replace: jest.fn(), setParams: jest.fn() } }));

const ID = 'p1';
const PATH = `/projects/${ID}`;
const bodyOf = (call: { init: RequestInit }) => JSON.parse(call.init.body as string);
const agentPosts = <Call extends { method: string; url: URL }>(calls: Call[], suffix: string) =>
  calls.filter((call) => call.method === 'POST' && call.url.pathname.endsWith(suffix));

/** Simule la réponse de l'utilisateur à la boîte de confirmation RG11. */
function answerConfirmation(choice: 'Continuer' | 'Annuler') {
  return jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons?: AlertButton[]) => {
    buttons?.find((button) => button.text === choice)?.onPress?.();
  });
}

beforeEach(async () => {
  process.env.EXPO_PUBLIC_API_URL = API;
  await clearToken();
  jest.restoreAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

test('affiche le brief et l’étape atteinte selon le statut', async () => {
  mockApi({ [`GET ${PATH}/`]: () => json(200, testFullProject('idea_chosen', { network: 'facebook', ratio: '4:5' })) });

  await renderWithProviders(<ProjectScreen id={ID} />);

  expect(await screen.findByText(fr.project.step(2))).toBeOnTheScreen();
  expect(screen.getByText(fr.status.idea_chosen)).toBeOnTheScreen();
  expect(screen.getByText('Finance personnelle')).toBeOnTheScreen();
  expect(screen.getByText('4:5')).toBeOnTheScreen();
});

test('projet introuvable : message du serveur et « Réessayer »', async () => {
  mockApi({ [`GET ${PATH}/`]: () => json(404, { detail: 'Projet introuvable.', code: 'NOT_FOUND' }) });

  await renderWithProviders(<ProjectScreen id={ID} />);

  expect(await screen.findByRole('alert')).toHaveTextContent('Projet introuvable.');
  expect(screen.getByRole('button', { name: fr.common.retry })).toBeOnTheScreen();
});

test('nouveau projet : l’agent Idées démarre seul, l’attente s’affiche, puis les 5 idées', async () => {
  let respond: (response: Response) => void = () => {};
  const { calls } = mockApi({
    [`GET ${PATH}/`]: () => json(200, testFullProject('draft')),
    [`POST ${PATH}/ideas/`]: () => new Promise<Response>((resolve) => (respond = resolve)),
  });

  await renderWithProviders(<ProjectScreen id={ID} autoGenerate />);

  expect(await screen.findByText(fr.agent.loading.ideas)).toBeOnTheScreen();
  await act(async () => respond(json(200, testFullProject('ideas_ready'))));
  expect(await screen.findAllByRole('radio')).toHaveLength(5);
  expect(screen.getByText(fr.ideas.chooseFirst)).toBeOnTheScreen();
  const posts = agentPosts(calls, '/ideas/');
  expect(posts).toHaveLength(1);
  expect(bodyOf(posts[0])).toEqual({ confirm: false });
});

test('brouillon sans génération automatique : bouton « Générer 5 idées »', async () => {
  const { calls } = mockApi({
    [`GET ${PATH}/`]: () => json(200, testFullProject('draft')),
    [`POST ${PATH}/ideas/`]: () => json(200, testFullProject('ideas_ready')),
  });
  await renderWithProviders(<ProjectScreen id={ID} />);

  await userEvent.setup().press(await screen.findByRole('button', { name: fr.ideas.generate }));

  expect(await screen.findAllByRole('radio')).toHaveLength(5);
  expect(agentPosts(calls, '/ideas/')).toHaveLength(1);
});

test('rg4 choisir une idée l’envoie au serveur et la marque choisie', async () => {
  const { calls } = mockApi({
    [`GET ${PATH}/`]: () => json(200, testFullProject('ideas_ready')),
    [`POST ${PATH}/ideas/idea-3/choose/`]: () => json(200, testFullProject('idea_chosen', { chosen_idea_id: 'idea-3' })),
  });
  await renderWithProviders(<ProjectScreen id={ID} />);

  await userEvent.setup().press(await screen.findByRole('radio', { name: fr.ideas.select('Idée 3') }));

  expect(await screen.findByRole('radio', { name: fr.ideas.select('Idée 3') })).toBeChecked();
  expect(bodyOf(agentPosts(calls, '/choose/')[0])).toEqual({ confirm: false });
  expect(screen.getByText(fr.ideas.nextOnWeb)).toBeOnTheScreen();
});

test('rg11 régénérer après un choix : confirmation avec le message du serveur, puis confirm=true', async () => {
  const alert = answerConfirmation('Continuer');
  const { calls } = mockApi({
    [`GET ${PATH}/`]: () => json(200, testFullProject('idea_chosen')),
    [`POST ${PATH}/ideas/`]: (_url, init) =>
      JSON.parse(init.body as string).confirm
        ? json(200, testFullProject('ideas_ready', { ideas: [testIdea(1, { title: 'Nouvelle idée', batch: 2 })] }))
        : json(409, { detail: 'L’idée choisie, le script et les scènes seront effacés.', code: 'CONFIRMATION_REQUIRED' }),
  });
  await renderWithProviders(<ProjectScreen id={ID} />);

  await userEvent.setup().press(await screen.findByRole('button', { name: fr.ideas.regenerate }));

  expect(await screen.findByText('Nouvelle idée')).toBeOnTheScreen();
  expect(alert).toHaveBeenCalledWith(
    fr.agent.confirmTitle,
    'L’idée choisie, le script et les scènes seront effacés.',
    expect.any(Array),
    expect.any(Object),
  );
  expect(agentPosts(calls, '/ideas/').map(bodyOf)).toEqual([{ confirm: false }, { confirm: true }]);
});

test('rg11 annuler la confirmation : aucun nouvel appel, rien ne change', async () => {
  answerConfirmation('Annuler');
  const { calls } = mockApi({
    [`GET ${PATH}/`]: () => json(200, testFullProject('idea_chosen')),
    [`POST ${PATH}/ideas/`]: () => json(409, { detail: 'Confirmez.', code: 'CONFIRMATION_REQUIRED' }),
  });
  await renderWithProviders(<ProjectScreen id={ID} />);

  await userEvent.setup().press(await screen.findByRole('button', { name: fr.ideas.regenerate }));

  expect(agentPosts(calls, '/ideas/')).toHaveLength(1);
  expect(screen.getByRole('radio', { name: fr.ideas.select('Idée 1') })).toBeChecked();
  expect(screen.queryByRole('alert')).toBeNull();
});

test('erreur de l’agent : message du serveur, idées conservées et nouvel essai possible', async () => {
  mockApi({
    [`GET ${PATH}/`]: () => json(200, testFullProject('ideas_ready')),
    [`POST ${PATH}/ideas/`]: () =>
      json(502, { detail: 'L’agent met trop de temps à répondre. Vos données sont conservées, réessayez.', code: 'AGENT_TIMEOUT' }),
  });
  await renderWithProviders(<ProjectScreen id={ID} />);

  await userEvent.setup().press(await screen.findByRole('button', { name: fr.ideas.regenerate }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'L’agent met trop de temps à répondre. Vos données sont conservées, réessayez.',
  );
  expect(screen.getAllByRole('radio')).toHaveLength(5);
  expect(screen.getByRole('button', { name: fr.ideas.regenerate })).toBeEnabled();
});

test('rg13 génération déjà en cours côté serveur : attente affichée, projet relu jusqu’à la fin', async () => {
  jest.useFakeTimers();
  let reads = 0;
  mockApi({
    [`GET ${PATH}/`]: () =>
      ++reads === 1
        ? json(200, testFullProject('draft', { agents: { ideas: { status: 'running', error_code: null, finished_at: null }, script: null, scenes: null } }))
        : json(200, testFullProject('ideas_ready')),
  });
  await renderWithProviders(<ProjectScreen id={ID} />);

  expect(await screen.findByText(fr.agent.loading.ideas)).toBeOnTheScreen();
  await act(() => jest.advanceTimersByTimeAsync(RUNNING_POLL_MS));

  expect(await screen.findAllByRole('radio')).toHaveLength(5);
});

test('alertes de l’agent : seules les alertes de sécurité « haute » sont montrées', async () => {
  mockApi({
    [`GET ${PATH}/`]: () =>
      json(
        200,
        testFullProject('ideas_ready', {
          ideas_context: {
            interpreted_theme: 'Gérer son budget',
            alerts: ['Sujet sensible'],
            safety_alerts: [
              { severity: 'haute', description: 'Conseil financier risqué' },
              { severity: 'faible', description: 'Détail mineur' },
            ],
          },
        }),
      ),
  });

  await renderWithProviders(<ProjectScreen id={ID} />);

  expect(await screen.findByText(/Gérer son budget/)).toBeOnTheScreen();
  expect(screen.getByText('• Sujet sensible')).toBeOnTheScreen();
  expect(screen.getByText(`• ${fr.ideas.safetyAlert('Conseil financier risqué')}`)).toBeOnTheScreen();
  expect(screen.queryByText(/Détail mineur/)).toBeNull();
});
