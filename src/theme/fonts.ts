import { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';

export const fontAssets = { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold };

// Le poids se choisit par la famille, jamais par fontWeight (ces polices n'ont qu'une graisse chacune).
export const font = {
  regular: 'Roboto_400Regular',
  medium: 'Roboto_500Medium',
  bold: 'Roboto_700Bold',
} as const;
