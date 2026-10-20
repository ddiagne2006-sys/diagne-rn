import { fr } from '@/i18n/fr';

import { api, ApiError, setUnauthorizedHandler } from './client';
import { clearToken, getToken, saveToken } from './session';

const BASE = 'http://192.168.1.20:8000/api';
const fetchMock = jest.fn();

function json(status: number, body: unknown) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function caught(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error('la requête aurait dû échouer');
}

beforeEach(async () => {
  process.env.EXPO_PUBLIC_API_URL = BASE;
  globalThis.fetch = fetchMock;
  fetchMock.mockReset();
  setUnauthorizedHandler(null);
  await clearToken();
});

afterEach(() => {
  jest.useRealTimers();
});

test("envoie Authorization: Token <jeton> quand un jeton est enregistré", async () => {
  await saveToken('jeton-123');
  fetchMock.mockResolvedValueOnce(json(200, { id: '1' }));

  await api('/auth/me/');

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe(`${BASE}/auth/me/`);
  expect((init.headers as Headers).get('Authorization')).toBe('Token jeton-123');
  expect((init.headers as Headers).get('Accept')).toBe('application/json');
});

test("n'envoie pas d'en-tête Authorization sans jeton", async () => {
  fetchMock.mockResolvedValueOnce(json(200, {}));

  await api('/config/');

  expect((fetchMock.mock.calls[0][1].headers as Headers).has('Authorization')).toBe(false);
});

test('sérialise le corps JSON et renvoie la réponse', async () => {
  fetchMock.mockResolvedValueOnce(json(200, { token: 't', user: { id: '1' } }));

  const result = await api('/auth/token/', { method: 'POST', json: { email: 'a@b.c', password: 'x' } });

  const init = fetchMock.mock.calls[0][1];
  expect(init.body).toBe(JSON.stringify({ email: 'a@b.c', password: 'x' }));
  expect((init.headers as Headers).get('Content-Type')).toBe('application/json');
  expect(result).toEqual({ token: 't', user: { id: '1' } });
});

test('renvoie undefined sur 204', async () => {
  fetchMock.mockResolvedValueOnce(json(204, null));

  await expect(api('/auth/token/logout/', { method: 'POST' })).resolves.toBeUndefined();
});

test('un 401 efface le jeton et déclenche la déconnexion', async () => {
  await saveToken('jeton-expire');
  const onUnauthorized = jest.fn();
  setUnauthorizedHandler(onUnauthorized);
  fetchMock.mockResolvedValueOnce(json(401, { detail: 'Vous devez être connecté.', code: 'NOT_AUTHENTICATED' }));

  const error = await caught(api('/auth/me/'));

  expect(error).toBeInstanceOf(ApiError);
  expect(error.status).toBe(401);
  expect(error.code).toBe('NOT_AUTHENTICATED');
  expect(getToken()).toBeNull();
  expect(onUnauthorized).toHaveBeenCalledTimes(1);
});

test('transforme une erreur {detail, code, fields} en ApiError', async () => {
  fetchMock.mockResolvedValueOnce(
    json(400, {
      detail: 'Les données envoyées sont invalides.',
      code: 'VALIDATION_ERROR',
      fields: { email: ['Saisissez une adresse e-mail valide.'] },
    }),
  );

  const error = await caught(api('/auth/token/', { method: 'POST', json: {} }));

  expect(error.status).toBe(400);
  expect(error.code).toBe('VALIDATION_ERROR');
  expect(error.message).toBe('Les données envoyées sont invalides.');
  expect(error.fieldError('email')).toBe('Saisissez une adresse e-mail valide.');
});

test("une réponse d'erreur sans JSON donne un message générique", async () => {
  fetchMock.mockResolvedValueOnce(new Response('<html>Bad Gateway</html>', { status: 502 }));

  const error = await caught(api('/projects/'));

  expect(error.status).toBe(502);
  expect(error.code).toBe('ERROR');
  expect(error.message).toBe(fr.errors.generic);
});

test('une erreur réseau devient NETWORK_ERROR, statut 0', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

  const error = await caught(api('/auth/me/'));

  expect(error.status).toBe(0);
  expect(error.code).toBe('NETWORK_ERROR');
  expect(error.message).toBe(fr.errors.network);
});

test('annule la requête après le délai et renvoie CLIENT_TIMEOUT', async () => {
  jest.useFakeTimers();
  fetchMock.mockImplementationOnce(
    (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          const abort = new Error('Aborted');
          abort.name = 'AbortError';
          reject(abort);
        });
      }),
  );

  const pending = caught(api('/auth/me/'));
  jest.advanceTimersByTime(30_000);
  const error = await pending;

  expect(error.code).toBe('CLIENT_TIMEOUT');
  expect(error.message).toBe(fr.errors.timeout);
});

test('le délai se règle par appel', async () => {
  jest.useFakeTimers();
  fetchMock.mockImplementationOnce(
    (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
      }),
  );

  const pending = caught(api('/projects/1/ideas/', { method: 'POST', timeoutMs: 200_000 }));
  jest.advanceTimersByTime(30_000);
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(false);
  jest.advanceTimersByTime(170_000);

  expect((await pending).code).toBe('CLIENT_TIMEOUT');
});

test("sans EXPO_PUBLIC_API_URL, erreur CONFIG sans appel réseau", async () => {
  delete process.env.EXPO_PUBLIC_API_URL;

  const error = await caught(api('/auth/me/'));

  expect(error.code).toBe('CONFIG');
  expect(fetchMock).not.toHaveBeenCalled();
});
