import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { emptyFieldErrors, formErrorsFrom, type FormErrors } from '@/auth/formErrors';
import { Button } from '@/components/Button';
import { FormAlert } from '@/components/FormAlert';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { fr } from '@/i18n/fr';

import { AuthCard } from './AuthCard';

const FIELDS = ['email', 'password'] as const;
type Field = (typeof FIELDS)[number];

export function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors<Field>>({ fields: {} });
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  async function submit() {
    if (submitting) return;
    const empty = emptyFieldErrors({ email, password });
    if (empty) return setErrors(empty);
    setErrors({ fields: {} });
    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
      // La garde de navigation (Stack.Protected) ouvre l'espace connecté
    } catch (error) {
      setErrors(formErrorsFrom(error, FIELDS));
      setSubmitting(false);
    }
  }

  return (
    <Screen centered>
      <AuthCard title={fr.auth.signInTitle} subtitle={fr.auth.signInSubtitle}>
        {errors.general ? <FormAlert message={errors.general} /> : null}
        <TextField
          label={fr.auth.email}
          value={email}
          onChangeText={setEmail}
          error={errors.fields.email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          editable={!submitting}
        />
        <TextField
          ref={passwordRef}
          label={fr.auth.password}
          value={password}
          onChangeText={setPassword}
          error={errors.fields.password}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          editable={!submitting}
        />
        <Button
          label={submitting ? fr.auth.signingIn : fr.auth.signIn}
          onPress={submit}
          loading={submitting}
        />
      </AuthCard>
      <View style={styles.switch}>
        <Button variant="link" label={fr.auth.toSignUp} onPress={() => router.replace('/sign-up')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switch: { alignItems: 'center' },
});
