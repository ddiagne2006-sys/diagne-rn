import { useCallback } from 'react';
import { Alert } from 'react-native';

import { ApiError } from '@/api/client';
import { fr } from '@/i18n/fr';

function askConfirmation(message: string) {
  return new Promise<boolean>((resolve) => {
    Alert.alert(
      fr.agent.confirmTitle,
      message,
      [
        { text: fr.common.cancel, style: 'cancel', onPress: () => resolve(false) },
        { text: fr.common.continue, style: 'destructive', onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/**
 * RG11 : appelle l'action avec confirm=false. Si le serveur répond 409 CONFIRMATION_REQUIRED (des résultats en aval
 * seraient effacés), affiche son message et ne relance avec confirm=true que si l'utilisateur continue.
 * Résout à `false` si l'utilisateur annule. Toute autre erreur est relancée à l'appelant.
 */
export function useConfirmable() {
  return useCallback(async (action: (confirm: boolean) => Promise<unknown>): Promise<boolean> => {
    try {
      await action(false);
      return true;
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== 'CONFIRMATION_REQUIRED') throw error;
      if (!(await askConfirmation(error.message))) return false;
    }
    await action(true);
    return true;
  }, []);
}
