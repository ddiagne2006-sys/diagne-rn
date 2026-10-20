import * as SecureStore from 'expo-secure-store';

import { clearToken, getToken, loadToken, saveToken } from './session';

const store = (SecureStore as unknown as { __store: Map<string, string> }).__store;

beforeEach(async () => {
  store.clear();
  await clearToken();
  jest.clearAllMocks();
});

test('saveToken enregistre le jeton dans SecureStore sous la clé viral.token', async () => {
  await saveToken('jeton-123');

  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('viral.token', 'jeton-123');
  expect(getToken()).toBe('jeton-123');
});

test('loadToken relit le jeton enregistré', async () => {
  store.set('viral.token', 'jeton-enregistre');

  await expect(loadToken()).resolves.toBe('jeton-enregistre');
  expect(getToken()).toBe('jeton-enregistre');
});

test('loadToken renvoie null sans jeton', async () => {
  await expect(loadToken()).resolves.toBeNull();
});

test('loadToken renvoie null si SecureStore échoue', async () => {
  jest.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error('trousseau indisponible'));

  await expect(loadToken()).resolves.toBeNull();
  expect(getToken()).toBeNull();
});

test('clearToken efface le jeton en mémoire et dans SecureStore', async () => {
  await saveToken('jeton-123');

  await clearToken();

  expect(getToken()).toBeNull();
  expect(store.has('viral.token')).toBe(false);
});

test('clearToken ne lève pas si SecureStore échoue', async () => {
  jest.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error('rien à effacer'));

  await expect(clearToken()).resolves.toBeUndefined();
});
