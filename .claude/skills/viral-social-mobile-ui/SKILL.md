

# Skill 1 : viral-social-mobile-ui

```
---
name: "viral-social-mobile-ui"
description: "Utiliser pour implémenter ou relire l'interface de l'app mobile Viral Social en React Native (Expo) : jetons de design, Roboto, Font Awesome, navigation Expo Router, composants, écrans, accessibilité, états."
---
```

# Viral Social — interface mobile (Expo)

Application dans `mobile/` : Expo, React Native, TypeScript strict, Expo Router, TanStack Query. Elle reprend l'identité du site web (cartes blanches arrondies, fond dégradé bleu-lilas, couleur d'action `#2563eb`). Police **Roboto**, icônes **Font Awesome**, aucun emoji, aucune autre police ni bibliothèque d'icônes, pas de NativeWind.

## Paquets (toujours `npx expo install` pour les paquets natifs)

```bash
npx expo install expo-font @expo-google-fonts/roboto expo-splash-screen expo-linear-gradient \
  expo-clipboard react-native-svg expo-secure-store expo-network
npm i @fortawesome/react-native-fontawesome @fortawesome/fontawesome-svg-core \
  @fortawesome/free-solid-svg-icons @fortawesome/free-regular-svg-icons @fortawesome/free-brands-svg-icons
```

Vérifier les versions de pairs affichées à l'installation (`react-native-svg`) et lancer `npx expo-doctor`.

## Jetons de design (src/theme/tokens.ts)

```ts
export const colors = {
  primary: '#2563eb', primaryHover: '#1d4ed8', primaryTint: '#eff4ff', navHover: '#dbe5fb',
  surface: '#ffffff', sidebar: '#e8eefc',
  ink: '#111827', inkSoft: '#374151', muted: '#6b7280', line: '#e5e7eb',
  success: '#16a34a', successBg: '#dcfce7', warning: '#d97706', warningBg: '#fef3c7', infoBg: '#dbeafe',
} as const
export const gradients = {
  brand: ['#2563eb', '#a855f7'],
  page: ['#eaf0fc', '#f6f1fb'],
} as const
export const radius = { field: 10, card: 14 } as const
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const
export const touch = { min: 48 } as const
```

Le dégradé se fait avec `LinearGradient` d'`expo-linear-gradient` (`start={{x:0,y:0}} end={{x:1,y:1}}`). Typographie : titre 26 graisse 700 ; texte 14 à 15 ; légendes 12 à 13 ; graisses 400, 500, 700. Bouton principal : fond `primary`, texte blanc, graisse 500, `minHeight: 48`, coins 10. Bouton secondaire : bordure et texte `primary`, fond blanc. Aucune couleur écrite en dur dans un composant.

## Police Roboto (src/theme/fonts.ts et app/_layout.tsx)

```ts
import { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto'
export const fontAssets = { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold }
export const font = { regular: 'Roboto_400Regular', medium: 'Roboto_500Medium', bold: 'Roboto_700Bold' } as const
```

Dans `_layout.tsx` : `SplashScreen.preventAutoHideAsync()` au niveau du module, `const [loaded, error] = useFonts(fontAssets)`, masquer l'écran de démarrage quand `loaded || error`, et ne rien rendre avant. Utiliser `fontFamily: font.medium` (le poids ne se règle pas par `fontWeight` avec ces polices). Un composant `AppText` central applique `font.regular` par défaut.

## Icônes Font Awesome

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome'
import { faWandMagicSparkles } from '@fortawesome/free-solid-svg-icons'
<FontAwesomeIcon icon={faWandMagicSparkles} size={20} color={colors.primary} />
```

Importer chaque icône par son nom (jamais d'ajout global). Préfixer les imports `regular` par `far` et `brands` par `fab`. Même correspondance que sur le site : logo `faBolt` ; Accueil `faTableCellsLarge` ; Nouvelle vidéo `faWandMagicSparkles` ; Projets `faFolderOpen` (regular) ; Paramètres `faGear` ; étapes `faPen`, `faLightbulb`, `faMicrophoneLines`, `faClapperboard` ; terminé `faCheck` ; réseaux `faTiktok`, `faFacebook`, `faYoutube` (brands) ; sélection `faCircleCheck` / `faCircle` ; chargement `faCircleNotch` (rotation avec `Animated`, désactivée si « réduire les animations » est actif) ; copier `faCopy` ; régénérer `faArrowsRotate` ; supprimer `faTrash` ; export `faDownload` ; erreur `faTriangleExclamation`. Un bouton qui n'a qu'une icône porte un `accessibilityLabel` en français. Vérifier le nom exact dans la version installée.

## Navigation (Expo Router)

```
src/app/
  _layout.tsx                 polices, splash, QueryClientProvider, SessionProvider, Stack.Protected
  sign-in.tsx  sign-up.tsx
  (app)/_layout.tsx           Stack (écrans connectés)
  (app)/(tabs)/_layout.tsx    Tabs : index (Accueil), new, projects, settings
  (app)/project/[id].tsx      assistant 4 étapes (lire l'id avec useLocalSearchParams)
```

Les composants, hooks et utilitaires vivent hors de `src/app` (tout ce qui est dans `src/app` devient une route). Les écrans réservés aux connectés sont dans `<Stack.Protected guard={isSignedIn}>`, la connexion dans `<Stack.Protected guard={!isSignedIn}>`. Après connexion : `router.replace('/')`.

## Composants

| Composant | Rôle | Points d'attention |
| --- | --- | --- |
| `Stepper` | 4 étapes, retour aux étapes validées | Indicateur compact « Étape 2 sur 4 » ; étape future non pressable ; `accessibilityState={{ selected }}` |
| `NetworkCard` | Choix du réseau | `accessibilityRole="radio"`, ratio affiché (renvoyé par l'API) |
| `DurationPicker` | 15, 30, 60, 90 s | Groupe de boutons radio |
| `AgentLoading` | Nom de l'agent, étapes, progression | Annonce vocale du chargement ; visible pendant toute la mutation (jusqu'à 200 s) |
| `IdeaCard` | Angle, titre, accroche, score | Sélection unique, `accessibilityState={{ selected }}` |
| `SegmentEditor` | Texte, minutage, réécriture | Auto-sauvegarde 800 ms (RG19), compteur de mots, avertissement RG6 renvoyé par l'API, `KeyboardAvoidingView` |
| `SceneCard` | Voix-off, plan, lumière, ambiance, prompt | Copier (`expo-clipboard`), Régénérer avec chargement, bandeau si `is_stale` |
| `TimelineBar` | Frise des scènes | Largeur proportionnelle à la durée, zones pressables de 48 de haut |
| `AgentStatus` | État des agents | Couleurs success, warning, info |
| `Toast` | Retour d'action | Annoncé aux lecteurs d'écran, disparition après 2 s |

Les prompts vidéo et les textes de l'IA s'affichent en texte brut (`<Text selectable>`), jamais en HTML ni en WebView. L'export partage le texte avec `Share.share` de React Native, selon la route d'export du contrat.

## Règles d'écran

- Zones sûres : `SafeAreaView` ou `useSafeAreaInsets` ; barre d'onglets au-dessus de la zone de geste.
- `FlatList` pour les listes, tirer pour rafraîchir, `keyboardShouldPersistTaps="handled"` dans les formulaires.
- Cibles tactiles de 48 minimum (`minHeight`, `hitSlop`). Pas de défilement horizontal à 360 de largeur ; textes longs qui passent à la ligne.
- États obligatoires : chargement, vide (message et action), erreur (`faTriangleExclamation`, message en français, « Réessayer »), succès (toast).

## Accessibilité native

`accessibilityRole` sur chaque élément interactif, `accessibilityLabel` en français sur les icônes seules, `accessibilityState` pour sélection et désactivation, `accessibilityLiveRegion="polite"` (Android) et `AccessibilityInfo.announceForAccessibility` (iPhone) pour chargements et toasts. Contraste AA. Respecter `AccessibilityInfo.isReduceMotionEnabled()`. Tester avec une police système agrandie : aucun texte coupé.

## Tests (jest-expo + @testing-library/react-native)

Composants critiques : `Stepper` (étape future non pressable), `SegmentEditor` (sauvegarde après 800 ms avec minuteurs simulés), `SceneCard` (copie du prompt), affichage des erreurs par `code`. Modules natifs simulés (`expo-secure-store`, `expo-clipboard`).

## Checklist de revue

1. Roboto et Font Awesome partout ; aucun emoji ni autre police.
2. Aucune couleur écrite en dur : uniquement `tokens.ts`.
3. Chaque icône-bouton a un `accessibilityLabel`.
4. Les textes d'interface sont dans `src/i18n/fr.ts`.
5. Zones sûres, clavier et cibles de 48 gérés sur chaque écran.
6. Quatre états par écran.
7. Aucun contenu IA rendu en HTML ou WebView.
8. Les paquets natifs ont été installés avec `npx expo install`.

---
