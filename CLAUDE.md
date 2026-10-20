# CLAUDE.md — Viral Social mobile (React Native / Expo)

## Projet

Viral Social transforme un brief (sujet, durée 15/30/60/90 s, réseau Facebook / TikTok / YouTube) en dossier de production vidéo : 5 idées, script voix-off minuté en 5 segments, découpage en scènes avec prompts vidéo en anglais. Cette application est la **version mobile** (Android et iPhone) du site web.

Elle ne parle qu'à l'**API Django existante** (dossier `Viral Social`, avec `backend/` et `frontend/` pour le web). Elle n'appelle jamais n8n : les 3 agents (Idées, Scripts, Découpage) sont appelés par l'API, jamais par le téléphone. La plateforme ne génère pas la vidéo, seulement du texte.

Référence fonctionnelle : le cahier des charges « Cahier des charges — Viral Social » (règles RG1 à RG19, écrans, routes) et `backend/openapi.yaml` (contrat d'API, source de vérité des routes et des types). Référence visuelle : le site web (`frontend/`) et son skill `viral-social-react-ui`.

## État actuel (à lire avant toute modification)

- **Le projet Expo existe déjà. Ne jamais relancer `create-expo-app`** ni recréer le projet. Lire `package.json`, `app.json` et l'arborescence avant de modifier quoi que ce soit, puis faire des changements minimaux et cohérents avec l'existant.
- L'API Django est terminée et testée. On ne la modifie que par une **tranche backend dédiée** (voir « Prérequis backend »), jamais au fil de l'eau.
- Vérifier la version du SDK Expo du projet (`package.json`) et qu'elle est supportée par l'application **Expo Go** installée sur le téléphone. En cas d'incompatibilité, aligner le SDK du projet (`npx expo install expo@<version>` puis `npx expo install --fix`) plutôt que de contourner.
- L'application est dans le dossier `mobile/` du dépôt, au même niveau que `backend/` et `frontend/`. Si elle est ailleurs, adapter le chemin du script `api:types`.

## Stack

- **Expo** (React Native ; le projet est en SDK 57 avec React Native 0.86 et React 19.2, version lue dans `package.json`), **TypeScript strict**.
- **Expo Router** (routage par fichiers dans `src/app`), `Stack.Protected` pour les écrans réservés aux utilisateurs connectés.
- **TanStack Query** pour l'état serveur, avec `onlineManager` (réseau) et `focusManager` (`AppState`).
- **expo-secure-store** pour le jeton d'authentification (Keychain iOS, Keystore Android).
- **Police Roboto** : `@expo-google-fonts/roboto` + `expo-font` (`useFonts`), sans CDN.
- **Icônes Font Awesome Free** : `@fortawesome/react-native-fontawesome` + `@fortawesome/fontawesome-svg-core` + `react-native-svg` + `free-solid-svg-icons`, `free-regular-svg-icons`, `free-brands-svg-icons`, importées une par une. Ne pas utiliser `@expo/vector-icons` (la documentation Expo le déconseille).
- **Styles** : `StyleSheet.create` et jetons dans `src/theme/` (couleurs, espacements, typographie). Pas de NativeWind ni d'autre bibliothèque de style sans accord.
- `expo-linear-gradient` (dégradés de la marque), `expo-clipboard` (copie des prompts), `react-native-safe-area-context` (zones sûres, déjà fournie avec Expo Router).
- **Tests** : `jest-expo` + `@testing-library/react-native` (versions compatibles avec le SDK du projet : les installer avec `npx expo install`). Tests de bout en bout avec Maestro plus tard, pas maintenant.
- **Types d'API** générés par `openapi-typescript` depuis `../backend/openapi.yaml`.

## Commandes courantes

```bash
# Dans mobile/
npx expo start                  # serveur de développement, QR code pour Expo Go
npx expo start --clear          # vider le cache Metro
npx expo install <paquet>       # TOUJOURS pour un paquet natif (version compatible avec le SDK)
npx expo-doctor                 # diagnostic des dépendances
npx expo lint                   # ESLint
npx tsc --noEmit                # types
npm test                        # jest-expo
npm run api:types               # openapi-typescript ../backend/openapi.yaml -o src/api/schema.d.ts

# Dans backend/ (voir « Réseau de développement »)
python manage.py runserver 0.0.0.0:8000
```

## Structure du code

```
mobile/
  src/
    app/                       routes (tout ce qui est ici est une route)
      _layout.tsx              polices, splash, providers, Stack.Protected
      sign-in.tsx, sign-up.tsx
      (app)/_layout.tsx        pile des écrans connectés
      (app)/(tabs)/_layout.tsx onglets : Accueil, Nouvelle vidéo, Projets, Paramètres
      (app)/(tabs)/index.tsx, new.tsx, projects.tsx, settings.tsx
      (app)/project/[id].tsx   assistant en 4 étapes (Brief, Idées, Script, Scènes)
    components/                Stepper, NetworkCard, DurationPicker, AgentLoading, IdeaCard,
                               SegmentEditor, SceneCard, TimelineBar, AgentStatus, Toast, états
    api/                       client.ts, session.ts, hooks, queryKeys.ts, schema.d.ts (généré)
    theme/                     tokens.ts, fonts.ts
    i18n/fr.ts                 tous les textes de l'interface
    domain/                    formats (durée, pourcentage), libellés de statut
  .env.local                   EXPO_PUBLIC_API_URL (ignoré par git)
```

L'arborescence est indicative : respecter celle du projet existant et ne la réorganiser qu'avec accord. Les routes exactes viennent de `openapi.yaml`.

## Règles de travail

1. **Le serveur décide, le mobile affiche.** Toute règle de gestion (RG1 à RG19, statuts, invalidation, quotas) vit dans le backend. Le mobile reprend les bornes pour le confort (sujet de 3 à 200 caractères, durées 15/30/60/90), jamais pour la sécurité.
2. **Contrat d'API.** `openapi.yaml` est la source de vérité. N'inventer aucune route. Les types viennent de `src/api/schema.d.ts` généré : ne jamais les réécrire à la main. Toute erreur d'API a la forme `{ detail, code, fields? }`.
3. **n8n.** Aucune URL de webhook, aucun secret, aucune mention de n8n dans l'application. `EXPO_PUBLIC_*` est lisible en clair dans l'app : la seule variable publique est `EXPO_PUBLIC_API_URL`, lue en notation pointée (`process.env.EXPO_PUBLIC_API_URL`, jamais en crochets ni déstructurée).
4. **Authentification par jeton.** Le jeton est stocké uniquement dans `expo-secure-store` (jamais AsyncStorage), envoyé dans `Authorization: Token <jeton>`, jamais écrit dans les journaux. Une réponse 401 efface le jeton et ramène à la connexion. Pas de cookies de session ni de CSRF côté mobile.
5. **Paquets natifs** : `npx expo install`. Rester compatible Expo Go ; ajouter un module natif qui exige une development build seulement avec accord explicite.
6. **Contenu généré par l'IA** : affiché en texte brut dans `<Text>`. Aucune WebView ni HTML.
7. **Appels d'agent longs.** Le serveur attend jusqu'à 90 s par tentative, avec un nouvel essai : le client mobile accepte jusqu'à 200 s pour les routes d'agent, avec `AgentLoading` visible. Si l'application passe en arrière-plan, rafraîchir le projet à son retour (`focusManager`). Un double appui est ignoré pendant la mutation (le serveur applique aussi RG13, code 409).
8. **Données.** Tout l'état vit en base. TanStack Query est un cache, pas une source de vérité. AsyncStorage seulement pour des préférences d'affichage sans importance.
9. **Langue.** Interface en français (textes dans `src/i18n/fr.ts`), messages d'erreur de l'API affichés tels quels, code, variables et commits en anglais.
10. **Pas d'emoji** dans l'interface : uniquement des icônes Font Awesome. Aucune couleur écrite en dur dans un composant : uniquement les jetons.
11. **Dépôt hors OneDrive** de préférence : la synchronisation ralentit Metro et `node_modules`. Sinon, exclure `node_modules` de la synchronisation.

## Prérequis backend (tranche M0, à faire avant l'authentification mobile)

Le site utilise une session et un jeton CSRF, mal adaptés à une application native. Le backend doit exposer, **en plus** de l'existant (le site web ne change pas) :

- `POST /api/auth/token/` : `{ email, password }` → `{ token, user }` ; identifiants faux → 400 `INVALID_CREDENTIALS`. Vue anonyme sans authentification de session (donc sans CSRF, sans `csrf_exempt`), avec limitation du nombre de tentatives.
- `POST /api/auth/token/logout/` : supprime le jeton de l'appareil, 204.
- `Authorization: Token <jeton>` accepté sur toutes les routes existantes (`GET /api/auth/me/`, projets, agents, etc.), avec le même format d'erreur et un 401 forcé sans authentification.
- L'inscription existante doit fonctionner sans cookie ; l'application appelle ensuite `POST /api/auth/token/`.
- Jeton : `django-rest-knox` (plusieurs appareils, expiration, jetons hachés) si compatible avec la version de Django du projet, sinon `rest_framework.authtoken` en documentant ses limites (un seul jeton par utilisateur : se déconnecter d'un appareil déconnecte les autres ; pas d'expiration).
- Tests pytest, `openapi.yaml` régénéré, puis `npm run api:types` côté mobile.

## Réseau de développement (API sur le PC, téléphone sur le même Wi-Fi)

- Lancer l'API avec `python manage.py runserver 0.0.0.0:8000`. Ajouter l'adresse IP du PC aux `ALLOWED_HOSTS` de développement (variable d'environnement, jamais en production).
- Trouver l'IP du PC avec `ipconfig` (adresse IPv4 de la carte Wi-Fi). Autoriser le port 8000 dans le pare-feu Windows (réseau privé).
- `mobile/.env.local` : `EXPO_PUBLIC_API_URL=http://<IP-du-PC>:8000/api`. Un rechargement complet de l'app suffit après modification. Émulateur Android : `http://10.0.2.2:8000/api`.
- Le téléphone et le PC doivent être sur le même réseau Wi-Fi (pas de réseau invité isolé).
- Expo Go accepte en principe le HTTP en développement (à confirmer au premier essai). Une development build Android (Android 9 ou plus) bloque le HTTP en clair : activer `usesCleartextTraffic` via le plugin `expo-build-properties`, en développement seulement. **En production : HTTPS uniquement.**
- Le faux serveur n8n (`127.0.0.1:8765`) et n8n restent côté PC : le téléphone n'y accède jamais.
- Depuis Windows, il n'y a pas de simulateur iPhone : tester sur un iPhone réel avec Expo Go. Publier sur iPhone demande un compte Apple Developer (payant) et une compilation via EAS Build.

## UI native : jetons, Roboto, Font Awesome

- Jetons repris du site : action `#2563eb`, dégradé de marque `#2563eb` vers `#a855f7`, fond `#eaf0fc` vers `#f6f1fb`, rayons 10 (champs, boutons) et 14 (cartes). Définitions complètes dans le skill `viral-social-mobile-ui`.
- Roboto 400, 500, 700 chargée dans `_layout.tsx` ; masquer l'écran de démarrage tant que les polices ne sont pas prêtes.
- Navigation : onglets en bas (Accueil, Nouvelle vidéo, Projets, Paramètres). Assistant en pile par-dessus les onglets.
- Cibles tactiles de 48 points minimum. Zones sûres (`SafeAreaView` ou `useSafeAreaInsets`). `KeyboardAvoidingView` sur les formulaires et l'éditeur de segment. `FlatList` pour les listes, tirer pour rafraîchir.
- États obligatoires par écran : chargement, vide, erreur avec « Réessayer », succès (toast).
- Accessibilité : `accessibilityRole`, `accessibilityLabel` en français sur chaque bouton-icône, `accessibilityState`, annonces des chargements et des toasts, contraste AA, animations désactivées si « réduire les animations » est actif, polices agrandies sans coupure de texte.
- Auto-sauvegarde du segment 800 ms après la dernière frappe (RG19), et aussi au retrait du focus et au passage en arrière-plan.

## Écrans (parcours créateur ; l'administration reste sur le site web)

Connexion et inscription, Accueil, Nouvelle vidéo (brief), Mes projets (liste, recherche, duplication, suppression avec confirmation), Assistant de projet (Brief, Idées, Script, Scènes, export), Paramètres (profil, déconnexion).

## Définition de « terminé »

- `npx tsc --noEmit`, `npx expo lint`, `npm test` et `npx expo-doctor` passent.
- Types d'API à jour (`npm run api:types` ne produit aucun changement).
- Essai manuel du parcours complet sur Android **et** sur iPhone (Expo Go), à 360 de largeur et avec la taille de police du système agrandie.
- Aucune URL ni secret n8n, aucun jeton dans les journaux, aucune clé dans le code ; la seule variable `EXPO_PUBLIC_*` est l'adresse de l'API.
- Les règles de gestion touchées restent appliquées par le serveur et couvertes par ses tests.

## Documentation de référence

- Expo : https://docs.expo.dev/get-started/set-up-your-environment/ · https://docs.expo.dev/versions/latest/
- Expo Router : https://docs.expo.dev/router/introduction/ · https://docs.expo.dev/router/basics/core-concepts/ · https://docs.expo.dev/router/advanced/authentication/ · https://docs.expo.dev/router/advanced/protected/
- Jeton sécurisé : https://docs.expo.dev/versions/latest/sdk/securestore/
- Variables : https://docs.expo.dev/guides/environment-variables/
- Polices : https://docs.expo.dev/develop/user-interface/fonts/ · Font Awesome : https://docs.fontawesome.com/web/use-with/react-native/
- Zones sûres : https://docs.expo.dev/develop/user-interface/safe-areas/ · Tests : https://docs.expo.dev/develop/unit-testing/
- TanStack Query (React Native) : https://tanstack.com/query/latest/docs/framework/react/react-native
- Authentification par jeton (DRF) : https://www.django-rest-framework.org/api-guide/authentication/
- Compilation et publication : https://docs.expo.dev/build/introduction/

## Skills du projet

- `viral-social-mobile-ui` : jetons, Roboto, Font Awesome, navigation, composants, écrans, accessibilité.
- `viral-social-mobile-api` : authentification par jeton, client d'API, TanStack Query, erreurs, réseau, règles de gestion côté mobile.
- `viral-social-business-rules` : règles RG1 à RG19 (inchangées, le serveur les applique).

Charger le skill concerné avant d'implémenter ou de relire une fonctionnalité qui le touche. Le skill `viral-social-agents-n8n` concerne uniquement le backend.
