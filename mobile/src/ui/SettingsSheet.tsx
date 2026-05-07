import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from './Icon';
import { NoticeBanner, type AppNotice } from './NoticeBanner';

type SettingsSheetProps = {
  authAction: 'signin' | 'signup' | 'signout' | null;
  authNotice: AppNotice | null;
  emailInput: string;
  isSupabaseConfigured: boolean;
  onClose: () => void;
  onCreateAccount: () => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  passwordInput: string;
  session: Session | null;
  visible: boolean;
};

export function SettingsSheet({
  authAction,
  authNotice,
  emailInput,
  isSupabaseConfigured,
  onClose,
  onCreateAccount,
  onEmailChange,
  onPasswordChange,
  onSignIn,
  onSignOut,
  passwordInput,
  session,
  visible,
}: SettingsSheetProps) {
  const accountEmail = session?.user.email ?? null;

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <SafeAreaProvider>
        <SafeAreaView edges={['top']} style={styles.screen}>
          <StatusBar style="dark" />

          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>Settings</Text>
              <Text style={styles.title}>Settings</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.actionPressed,
              ]}
            >
              <Icon color="#2f241f" name="x" size={18} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!isSupabaseConfigured ? (
              <View style={styles.setupCard}>
                <Text style={styles.setupTitle}>Supabase setup required</Text>
                <Text style={styles.setupBody}>
                  Add the project URL and anon key in `mobile/.env`, then enable
                  Email auth in Supabase.
                </Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Account</Text>

              <View style={styles.surface}>
                {session ? (
                  <>
                    <View style={styles.accountRow}>
                      <View
                        style={[
                          styles.accountIconWrap,
                          styles.accountIconWrapActive,
                        ]}
                      >
                        <Icon color="#fff7ef" name="check-circle" size={18} />
                      </View>

                      <View style={styles.accountCopy}>
                        <Text style={styles.accountState}>Signed in</Text>
                        <Text style={styles.accountEmail}>
                          {accountEmail ?? 'Email unavailable'}
                        </Text>
                      </View>
                    </View>

                    {authNotice ? <NoticeBanner notice={authNotice} /> : null}

                    <Pressable
                      accessibilityRole="button"
                      disabled={authAction === 'signout'}
                      onPress={onSignOut}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        (pressed || authAction === 'signout') && styles.actionPressed,
                      ]}
                    >
                      {authAction === 'signout' ? (
                        <ActivityIndicator color="#9d4333" />
                      ) : (
                        <>
                          <Icon color="#9d4333" name="log-out" size={16} />
                          <Text style={styles.secondaryButtonLabel}>Sign out</Text>
                        </>
                      )}
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={styles.sectionBody}>
                      Sign in to sync notes and convert voice notes into text when
                      you have internet.
                    </Text>

                    {authNotice ? <NoticeBanner notice={authNotice} /> : null}

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Email</Text>
                      <TextInput
                        autoCapitalize="none"
                        autoComplete="email"
                        keyboardType="email-address"
                        onChangeText={onEmailChange}
                        placeholder="name@example.com"
                        placeholderTextColor="#8f7b72"
                        style={styles.textInput}
                        value={emailInput}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Password</Text>
                      <TextInput
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={onPasswordChange}
                        placeholder="At least 6 characters"
                        placeholderTextColor="#8f7b72"
                        secureTextEntry
                        style={styles.textInput}
                        textContentType="password"
                        value={passwordInput}
                      />
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      disabled={authAction === 'signin'}
                      onPress={onSignIn}
                      style={({ pressed }) => [
                        styles.primaryButton,
                        (pressed || authAction === 'signin') && styles.actionPressed,
                      ]}
                    >
                      {authAction === 'signin' ? (
                        <ActivityIndicator color="#fff7ef" />
                      ) : (
                        <>
                          <Icon color="#fff7ef" name="mail" size={16} />
                          <Text style={styles.primaryButtonLabel}>Sign in</Text>
                        </>
                      )}
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      disabled={authAction === 'signup'}
                      onPress={onCreateAccount}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        (pressed || authAction === 'signup') && styles.actionPressed,
                      ]}
                    >
                      {authAction === 'signup' ? (
                        <ActivityIndicator color="#9d4333" />
                      ) : (
                        <>
                          <Icon color="#9d4333" name="user" size={16} />
                          <Text style={styles.secondaryButtonLabel}>Create account</Text>
                        </>
                      )}
                    </Pressable>
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8f1e8',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  eyebrow: {
    color: '#8c7566',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    color: '#1f1614',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.8,
    marginTop: 4,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#efe3d6',
    borderRadius: 18,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  content: {
    gap: 14,
    paddingBottom: 36,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  setupCard: {
    backgroundColor: '#f5e5de',
    borderRadius: 22,
    gap: 6,
    padding: 16,
  },
  setupTitle: {
    color: '#722f25',
    fontSize: 17,
    fontWeight: '700',
  },
  setupBody: {
    color: '#7e4132',
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    color: '#8c7566',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  surface: {
    backgroundColor: 'rgba(255, 250, 245, 0.82)',
    borderRadius: 28,
    gap: 14,
    padding: 20,
  },
  sectionBody: {
    color: '#675349',
    fontSize: 15,
    lineHeight: 21,
  },
  accountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  accountIconWrap: {
    alignItems: 'center',
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  accountIconWrapActive: {
    backgroundColor: '#2d8f5e',
  },
  accountCopy: {
    flex: 1,
    gap: 3,
  },
  accountState: {
    color: '#8c7566',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  accountEmail: {
    color: '#1f1614',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    color: '#8c7566',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#fff7ef',
    borderRadius: 18,
    color: '#1f1614',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#ab4d38',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  primaryButtonLabel: {
    color: '#fff7ef',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#f4e3dd',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  secondaryButtonLabel: {
    color: '#9d4333',
    fontSize: 15,
    fontWeight: '700',
  },
  actionPressed: {
    opacity: 0.82,
  },
});
