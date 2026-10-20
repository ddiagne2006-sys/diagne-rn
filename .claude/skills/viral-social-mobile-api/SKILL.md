# Skill 2 : viral-social-mobile-api

```
---
name: "viral-social-mobile-api"
description: "Utiliser pour implémenter ou relire la couche données de l'app mobile Viral Social : authentification par jeton, client d'API, SecureStore, TanStack Query, erreurs, réseau de développement et règles de gestion côté mobile."
---
```

# Viral Social — données et API côté mobile

L'application parle uniquement à l'API Django (`EXPO_PUBLIC_API_URL`, qui se termine par `/api`). Elle n'appelle jamais n8n. Les routes, corps et types viennent de `backend/openapi.yaml` et de `src/api/schema.d.ts` (généré par `npm run api:types`) : n'inventer aucune route, ne rien réécrire à la main.

## Authentification par jeton

Prérequis backend (tranche M0) : `POST /api/auth/token/` (`{ email, password }` renvoie `{ token, user }`), `POST /api/auth/token/logout/`, et `Authorization: Token <jeton>` accepté partout. Pas de cookies ni de CSRF côté mobile.

```ts
// src/api/session.ts
import * as SecureStore from 'expo-secure-store'
const KEY = 'viral.token' // clés : lettres, chiffres, point, tiret, souligné
let cached: string | null = null
export async function loadToken() {
  try { cached = await SecureStore.getItemAsync(KEY) } catch { cached = null }
  return cached
}
export const getToken = () => cached
export async function saveToken(token: string) { cached = token; await SecureStore.setItemAsync(KEY, token) }
export async function clearToken() {
  cached = null
  try { await SecureStore.deleteItemAsync(KEY) } catch { /* rien à effacer */ }
}
```

Le jeton ne va jamais dans AsyncStorage ni dans les journaux. Tout appel à SecureStore est dans un `try/catch`.

## Client d'API (src/api/client.ts)

```ts
import { fr } from '../i18n/fr'
import { clearToken, getToken } from './session'

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public fields?: Record<string, string[]>) {
    super(message)
  }
}

let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn }

export async function api<T>(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<T> {
  const base = process.env.EXPO_PUBLIC_API_URL // notation pointée obligatoire
  if (!base) throw new ApiError(0, 'CONFIG', fr.errors.config)
  const { timeoutMs = 30_000, ...rest } = init
  const headers = new Headers(rest.headers)
  headers.set('Accept', 'application/json')
  if (rest.body) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Token ${token}`)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    let res: Response
    try {
      res = await fetch(`${base}${path}`, { ...rest, headers, signal: controller.signal })
    } catch (e) {
      const aborted = (e as Error).name === 'AbortError'
      throw new ApiError(0, aborted ? 'CLIENT_TIMEOUT' : 'NETWORK_ERROR', aborted ? fr.errors.timeout : fr.errors.network)
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      if (res.status === 401) { await clearToken(); onUnauthorized?.() }
      throw new ApiError(res.status, body.code ?? 'ERROR', body.detail ?? fr.errors.generic, body.fields)
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
  } finally {
    clearTimeout(timer)
  }
}
```

Délais : 30 s par défaut ; **200 s** pour les routes d'agent (le serveur attend jusqu'à 90 s par tentative, avec un nouvel essai). Les erreurs réseau et de configuration ont des textes en français dans `fr.ts` (en développement, le message réseau rappelle de vérifier que le téléphone et le PC sont sur le même Wi-Fi).

## Session et routes protégées

`SessionProvider` expose `isSignedIn`, `isLoading`, `signIn(email, password)`, `signOut()`. Au démarrage : `loadToken()` puis `GET /api/auth/me/` ; un échec 401 efface le jeton. `signIn` appelle `POST /api/auth/token/`, enregistre le jeton, met l'utilisateur en cache. `signOut` appelle la route de déconnexion (sans bloquer si le réseau est coupé), efface le jeton et vide le cache TanStack Query. `setUnauthorizedHandler(signOut)` est enregistré une fois au démarrage. L'écran de démarrage reste affiché tant que `isLoading` est vrai.

## TanStack Query

```ts
// src/api/queryClient.ts
import { AppState, Platform } from 'react-native'
import * as Network from 'expo-network'
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query'

onlineManager.setEventListener((setOnline) => {
  Network.getNetworkStateAsync().then((s) => setOnline(!!s.isConnected)).catch(() => setOnline(true))
  const sub = Network.addNetworkStateListener((s) => setOnline(!!s.isConnected))
  return () => sub.remove()
})
AppState.addEventListener('change', (status) => {
  if (Platform.OS !== 'web') focusManager.setFocused(status === 'active')
})

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: (n, e) => !(e instanceof ApiError && e.status >= 400 && e.status < 500) && n < 2 },
    mutations: { retry: false },
  },
})
```

- Clés : `['projects']`, `['project', id]`, `['dashboard']`.
- Les appels d'agent sont des mutations qui renvoient le **projet complet** : `queryClient.setQueryData(['project', id], project)` en cas de succès.
- `project.status` est la seule source de vérité de l'étape atteinte (`draft` étape 1, `ideas_ready` et `idea_chosen` étape 2, `script_ready` étape 3, `scenes_ready` étape 4). L'utilisateur peut revenir en arrière dans l'affichage (état local), jamais avancer au-delà du statut.
- Au retour de l'arrière-plan (`focusManager`), le projet ouvert est rafraîchi : si l'application a été suspendue pendant une génération, le serveur a pu la terminer.

## Erreurs

Toute erreur d'API a la forme `{ detail, code, fields? }`. Afficher le `detail` renvoyé, dans un toast ou une alerte, avec ces traitements propres :

| Code ou statut | Traitement |
| --- | --- |
| 401 | Jeton effacé, retour à la connexion |
| `CONFIRMATION_REQUIRED` (409) | `Alert.alert` de confirmation (Annuler / Continuer), puis nouvel appel avec `confirm` selon le contrat (RG11) |
| `RUN_ALREADY_ACTIVE` (409) | Message du serveur, bouton désactivé, rafraîchir le projet |
| `QUOTA_EXCEEDED` (429) | Message du serveur, pas de nouvel essai automatique |
| `AGENT_TIMEOUT`, `AGENT_INVALID_RESPONSE`, `AGENT_ERROR` (502) | Message du serveur et bouton « Réessayer » ; le projet reste intact |
| `IDEA_REQUIRED`, `IDEA_OUTDATED`, `SCRIPT_REQUIRED` (400) | Message du serveur, retour à l'étape concernée |
| `NETWORK_ERROR`, `CLIENT_TIMEOUT`, `CONFIG` | Textes de `fr.ts` ; aucun détail technique, aucune URL |

## Règles de gestion côté mobile (le serveur décide)

- RG1 : mêmes bornes que le serveur pour le confort (sujet 3 à 200 caractères, durées 15/30/60/90, réseau parmi trois).
- RG4 : bouton Script désactivé sans idée choisie, le serveur répond 400 sinon.
- RG6 : afficher `word_count`, `reading_seconds` et l'avertissement `too_long` renvoyés par l'API ; ne pas les recalculer.
- RG10 : bandeau d'obsolescence si les scènes sont `is_stale`, avec proposition de relancer le découpage.
- RG11 : confirmation avant d'effacer des résultats en aval (voir tableau des erreurs).
- RG13 : double appui ignoré pendant la mutation ; le serveur refuse aussi en 409.
- RG19 : sauvegarde du segment 800 ms après la dernière frappe, puis tout de suite au retrait du focus et au passage en arrière-plan (`AppState`) ; indicateur « Enregistré ».
- Aucun résultat d'agent simulé côté mobile.

## Réseau de développement

L'API tourne sur le PC (`runserver 0.0.0.0:8000`, IP du PC dans les `ALLOWED_HOSTS` de développement, port 8000 autorisé dans le pare-feu). `EXPO_PUBLIC_API_URL=http://<IP-du-PC>:8000/api` dans `.env.local` ; émulateur Android : `10.0.2.2`. Expo Go accepte en principe le HTTP en développement (à confirmer au premier essai) ; une development build Android demande `usesCleartextTraffic` (plugin `expo-build-properties`). En production, HTTPS uniquement.

## Tests

`fetch` et `expo-secure-store` simulés. Cas à couvrir : en-tête `Authorization` présent après connexion, 401 qui efface le jeton, erreur réseau transformée en `NETWORK_ERROR`, délai dépassé, `CONFIRMATION_REQUIRED` qui ouvre la confirmation, nouvel appel avec `confirm`.

## Checklist de revue

1. Aucune URL ni secret n8n dans le code ni dans le bundle ; seule variable publique : `EXPO_PUBLIC_API_URL`, lue en notation pointée.
2. Jeton uniquement dans `expo-secure-store`, jamais journalisé.
3. Types d'API générés ; aucune route inventée.
4. Délai de 200 s sur les routes d'agent, 30 s ailleurs.
5. Chaque erreur affiche le `detail` du serveur ou un texte de `fr.ts`.
6. Les règles de gestion ne sont pas dupliquées côté mobile (seulement des validations de confort).
7. Rafraîchissement du projet au retour de l'arrière-plan.
