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

const FIELDS = ['full_name', 'email', 'password'] as const;
type Field = (typeof FIELDS)[number];

export function SignUpScreen() {
  const { signUp } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FormErrors<Field>>({ fields: {} });
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  async function submit() {
    if (submitting) return;
    const empty = emptyFieldErrors({ full_name: fullName, email, password });
    if (empty) return setErrors(empty);
    setErrors({ fields: {} });
    setSubmitting(true);
    try {
      await signUp({ full_name: fullName.trim(), email: email.trim(), password });
    } catch (error) {
      setErrors(formErrorsFrom(error, FIELDS));
      setSubmitting(false);
    }
  }

  return (
    <Screen centered>
      <AuthCard title={fr.auth.signUpTitle} subtitle={fr.auth.signUpSubtitle}>
        {errors.general ? <FormAlert message={errors.general} /> : null}
        <TextField
          label={fr.auth.fullName}
          value={fullName}
          onChangeText={setFullName}
          error={errors.fields.full_name}
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          editable={!submitting}
        />
        <TextField
          ref={emailRef}
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
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={submit}
          editable={!submitting}
        />
        <Button
          label={submitting ? fr.auth.signingUp : fr.auth.signUp}
          onPress={submit}
          loading={submitting}
        />
      </AuthCard>
      <View style={styles.switch}>
        <Button variant="link" label={fr.auth.toSignIn} onPress={() => router.replace('/sign-in')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  switch: { alignItems: 'center' },
});
