import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  getRecordingPermissionsAsync,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';

import {
  getSupabaseClient,
  isSupabaseConfigured,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  supabase,
} from './src/lib/supabase';
import {
  deleteVoiceNote,
  initializeVoiceNotesStore,
  listVoiceNotes,
  persistVoiceNote,
} from './src/lib/voiceNotes';
import type { VoiceNote } from './src/types';
import { Icon } from './src/ui/Icon';

type AppTab = 'notes' | 'records' | 'account';
type NoticeTone = 'error' | 'info' | 'success';
type AppNotice = {
  tone: NoticeTone;
  text: string;
};

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  extension: '.m4a',
  numberOfChannels: 1,
  bitRate: 96000,
};

export default function App() {
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder);
  const [currentTab, setCurrentTab] = useState<AppTab>('notes');
  const [savedNotes, setSavedNotes] = useState<VoiceNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [queuedPlaybackId, setQueuedPlaybackId] = useState<string | null>(null);
  const [hasRecordingPermission, setHasRecordingPermission] = useState<
    boolean | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [accountSession, setAccountSession] = useState<Session | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(isSupabaseConfigured);
  const [authAction, setAuthAction] = useState<'signin' | 'signup' | 'signout' | null>(
    null
  );
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authNotice, setAuthNotice] = useState<AppNotice | null>(null);

  const activeNote = activeNoteId
    ? savedNotes.find((note) => note.id === activeNoteId) ?? null
    : null;
  const player = useAudioPlayer(activeNote ? { uri: activeNote.fileUri } : null, {
    keepAudioSessionActive: true,
    updateInterval: 250,
  });
  const playerStatus = useAudioPlayerStatus(player);
  const accountEmail = accountSession?.user.email ?? null;
  const isBusy = isLoading || isSaving || deletingNoteId !== null;
  const isAuthBusy = isAuthLoading || authAction !== null;
  const noteCountLabel =
    savedNotes.length === 1 ? '1 note' : `${savedNotes.length} notes`;
  const syncCountLabel =
    savedNotes.length === 1
      ? '1 local note waiting for sync'
      : `${savedNotes.length} local notes waiting for sync`;

  useEffect(() => {
    let isMounted = true;

    async function loadApp() {
      try {
        await initializeVoiceNotesStore();

        const [permission, notes] = await Promise.all([
          getRecordingPermissionsAsync(),
          listVoiceNotes(),
        ]);

        if (!isMounted) {
          return;
        }

        setHasRecordingPermission(permission.granted);
        setSavedNotes(notes);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(getErrorMessage(error, 'Could not load local notes.'));
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadApp();

    return () => {
      isMounted = false;
      void setAudioModeAsync({ allowsRecording: false });
    };
  }, []);

  useEffect(() => {
    if (!supabase) {
      setIsAuthLoading(false);
      return;
    }

    let isMounted = true;

    async function loadSession() {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error) {
        setAuthNotice({
          tone: 'error',
          text: getErrorMessage(error, 'Could not restore the account session.'),
        });
      }

      setAccountSession(data.session);
      setIsAuthLoading(false);
    }

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) {
        return;
      }

      setAccountSession(session);
      setIsAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (playerStatus.didJustFinish) {
      setActiveNoteId(null);
      setQueuedPlaybackId(null);
    }
  }, [playerStatus.didJustFinish]);

  useEffect(() => {
    if (!activeNoteId || queuedPlaybackId !== activeNoteId || !playerStatus.isLoaded) {
      return;
    }

    player.play();
    setQueuedPlaybackId(null);
  }, [activeNoteId, player, playerStatus.isLoaded, queuedPlaybackId]);

  useEffect(() => {
    if (!accountEmail) {
      return;
    }

    setEmailInput(accountEmail);
  }, [accountEmail]);

  useEffect(() => {
    if (!accountSession) {
      return;
    }

    setPasswordInput('');
  }, [accountSession]);

  async function refreshNotes() {
    const notes = await listVoiceNotes();
    setSavedNotes(notes);
  }

  async function handleStartRecording() {
    setErrorMessage(null);

    try {
      let granted = hasRecordingPermission;

      if (!granted) {
        const permission = await requestRecordingPermissionsAsync();
        granted = permission.granted;
        setHasRecordingPermission(permission.granted);
      }

      if (!granted) {
        setErrorMessage('Microphone access is required to record voice notes.');
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Could not start recording on this device.')
      );
    }
  }

  async function handleStopRecording() {
    if (!recorderState.isRecording) {
      return;
    }

    setErrorMessage(null);
    setIsSaving(true);

    const durationMillis = recorderState.durationMillis;

    try {
      await recorder.stop();

      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      const sourceUri = recorder.uri ?? recorderState.url;

      if (!sourceUri) {
        throw new Error('The recording finished without a local audio file.');
      }

      await persistVoiceNote({
        sourceUri,
        durationMillis,
        preferredExtension: RECORDING_OPTIONS.extension,
      });
      await refreshNotes();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Could not save the recording locally.')
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTogglePlayback(note: VoiceNote) {
    if (recorderState.isRecording || isSaving || deletingNoteId === note.id) {
      return;
    }

    setErrorMessage(null);

    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      if (activeNoteId === note.id) {
        if (playerStatus.playing) {
          player.pause();
        } else {
          player.play();
        }

        return;
      }

      setActiveNoteId(note.id);
      setQueuedPlaybackId(note.id);
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Could not play this saved note on the device.')
      );
      setActiveNoteId(null);
      setQueuedPlaybackId(null);
    }
  }

  async function handleDeleteNote(note: VoiceNote) {
    if (recorderState.isRecording || isSaving) {
      return;
    }

    setErrorMessage(null);
    setDeletingNoteId(note.id);

    try {
      if (activeNoteId === note.id) {
        player.pause();
        setActiveNoteId(null);
        setQueuedPlaybackId(null);
      }

      await deleteVoiceNote(note);
      await refreshNotes();
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, 'Could not remove this saved note from the device.')
      );
    } finally {
      setDeletingNoteId(null);
    }
  }

  async function handleSignIn() {
    const normalizedEmail = normalizeEmail(emailInput);
    const normalizedPassword = normalizePassword(passwordInput);

    setAuthNotice(null);

    if (!normalizedEmail) {
      setAuthNotice({
        tone: 'error',
        text: 'Enter a valid email address before signing in.',
      });
      return;
    }

    if (!normalizedPassword) {
      setAuthNotice({
        tone: 'error',
        text: 'Enter the account password before signing in.',
      });
      return;
    }

    if (!isSupabaseConfigured) {
      setAuthNotice({
        tone: 'error',
        text: 'Supabase auth is not configured yet. Add the project URL and anon key in mobile/.env first.',
      });
      return;
    }

    setAuthAction('signin');

    try {
      const session = await signInWithEmailPassword(
        normalizedEmail,
        normalizedPassword
      );
      setEmailInput(normalizedEmail);
      setAccountSession(session);
      setAuthNotice({
        tone: 'success',
        text: `Signed in as ${normalizedEmail}. Server sync is now unlocked.`,
      });
    } catch (error) {
      setAuthNotice({
        tone: 'error',
        text: getErrorMessage(error, 'Could not sign in with this email and password.'),
      });
    } finally {
      setAuthAction(null);
    }
  }

  async function handleCreateAccount() {
    const normalizedEmail = normalizeEmail(emailInput);
    const normalizedPassword = normalizePassword(passwordInput);

    setAuthNotice(null);

    if (!normalizedEmail) {
      setAuthNotice({
        tone: 'error',
        text: 'Enter a valid email address before creating an account.',
      });
      return;
    }

    if (!normalizedPassword) {
      setAuthNotice({
        tone: 'error',
        text: 'Use a password with at least 6 characters.',
      });
      return;
    }

    if (!isSupabaseConfigured) {
      setAuthNotice({
        tone: 'error',
        text: 'Supabase auth is not configured yet. Add the project URL and anon key in mobile/.env first.',
      });
      return;
    }

    setAuthAction('signup');

    try {
      const session = await signUpWithEmailPassword(
        normalizedEmail,
        normalizedPassword
      );
      setEmailInput(normalizedEmail);
      setAccountSession(session);
      setAuthNotice(
        session
          ? {
              tone: 'success',
              text: `Account created and signed in as ${normalizedEmail}.`,
            }
          : {
              tone: 'info',
              text: 'Account created, but Supabase is requiring email confirmation before sign-in. Disable Confirm email in the Email provider for a password-only dev flow.',
            }
      );
    } catch (error) {
      setAuthNotice({
        tone: 'error',
        text: getErrorMessage(error, 'Could not create this account.'),
      });
    } finally {
      setAuthAction(null);
    }
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    setAuthNotice(null);
    setAuthAction('signout');

    try {
      const { error } = await getSupabaseClient().auth.signOut();

      if (error) {
        throw error;
      }

      setAccountSession(null);
      setPasswordInput('');
      setAuthNotice({
        tone: 'info',
        text: 'Signed out. Local notes remain on this device until sync is added.',
      });
    } catch (error) {
      setAuthNotice({
        tone: 'error',
        text: getErrorMessage(error, 'Could not sign out of this account.'),
      });
    } finally {
      setAuthAction(null);
    }
  }

  function handleSyncPress() {
    setAuthNotice(null);

    if (savedNotes.length === 0) {
      setAuthNotice({
        tone: 'info',
        text: 'Record at least one note before syncing to the server.',
      });
      return;
    }

    if (!isSupabaseConfigured) {
      setCurrentTab('account');
      setAuthNotice({
        tone: 'error',
        text: 'Supabase auth is not configured yet. Finish the project setup before testing sync.',
      });
      return;
    }

    if (!accountSession) {
      setCurrentTab('account');
      setAuthNotice({
        tone: 'info',
        text: 'Sign in with email before syncing notes to the server. Local recording still works without an account.',
      });
      return;
    }

    setCurrentTab('account');
    setAuthNotice({
      tone: 'success',
      text: `${syncCountLabel}. The account is connected, so server upload is the next feature to implement.`,
    });
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.appBar}>
        <View>
          <Text style={styles.appName}>FieldNotes</Text>
          <Text style={styles.appSubhead}>Field capture</Text>
        </View>

        <View style={styles.appBarStatus}>
          <Text style={styles.appBarStatusLabel}>
            {accountEmail ? 'Account ready' : 'Local only'}
          </Text>
          {isBusy || isAuthBusy ? <ActivityIndicator color="#9b3d2f" /> : null}
        </View>
      </View>

      <View style={styles.tabs}>
        <TabButton
          icon="mic"
          isActive={currentTab === 'notes'}
          label="Notes"
          onPress={() => {
            setCurrentTab('notes');
          }}
        />
        <TabButton
          icon="file-text"
          isActive={currentTab === 'records'}
          label="Records"
          onPress={() => {
            setCurrentTab('records');
          }}
        />
        <TabButton
          icon="user"
          isActive={currentTab === 'account'}
          label="Account"
          onPress={() => {
            setCurrentTab('account');
          }}
        />
      </View>

      {currentTab === 'notes' ? (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.recorderPanel}>
            <View style={styles.recorderTop}>
              <View>
                <Text style={styles.panelLabel}>
                  {recorderState.isRecording ? 'Recording now' : 'Quick note'}
                </Text>
                <Text style={styles.timer}>{formatDuration(recorderState.durationMillis)}</Text>
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={isBusy}
                onPress={
                  recorderState.isRecording
                    ? handleStopRecording
                    : handleStartRecording
                }
                style={({ pressed }) => [
                  styles.recordAction,
                  recorderState.isRecording
                    ? styles.recordActionStop
                    : styles.recordActionStart,
                  (pressed || isBusy) && styles.actionPressed,
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff8ec" />
                ) : (
                  <Icon
                    color="#fff8ec"
                    name={recorderState.isRecording ? 'square' : 'mic'}
                    size={22}
                  />
                )}
                <Text style={styles.recordActionLabel}>
                  {isLoading
                    ? 'Loading'
                    : isSaving
                      ? 'Saving'
                      : recorderState.isRecording
                        ? 'Stop'
                        : 'Record'}
                </Text>
              </Pressable>
            </View>

            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            {hasRecordingPermission === false ? (
              <Text style={styles.recorderHint}>
                Microphone permission is required before you can record.
              </Text>
            ) : (
              <Text style={styles.recorderHint}>
                Tap once to start. Tap again when the note is complete.
              </Text>
            )}
          </View>

          <View style={styles.syncPanel}>
            <View style={styles.syncTop}>
              <View style={styles.syncTitleWrap}>
                <View style={styles.syncIconWrap}>
                  <Icon color="#7d6552" name="cloud" size={18} />
                </View>
                <View>
                  <Text style={styles.syncTitle}>Server sync</Text>
                  <Text style={styles.syncMeta}>{syncCountLabel}</Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={recorderState.isRecording || isSaving || deletingNoteId !== null}
                onPress={handleSyncPress}
                style={({ pressed }) => [
                  styles.syncButton,
                  (pressed ||
                    recorderState.isRecording ||
                    isSaving ||
                    deletingNoteId !== null) &&
                    styles.actionPressed,
                ]}
              >
                <Text style={styles.syncButtonLabel}>
                  {accountSession ? 'Check sync' : 'Connect account'}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.syncBody}>
              {accountSession
                ? `Signed in as ${accountEmail ?? 'your account'}. Recording remains local-first, and sync can now be tied to this account.`
                : 'You can keep recording offline with no account. Sign-in is only required when you want to sync notes to the server.'}
            </Text>

            {authNotice ? <NoticeBanner notice={authNotice} /> : null}
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.sectionMeta}>{noteCountLabel}</Text>
            </View>
          </View>

          {savedNotes.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Icon color="#7d6552" name="mic" size={18} />
              </View>
              <Text style={styles.emptyTitle}>No field notes yet</Text>
              <Text style={styles.emptyBody}>
                Record a note and it will appear here.
              </Text>
            </View>
          ) : (
            savedNotes.map((note) => {
              const isActive = activeNoteId === note.id;
              const isDeleting = deletingNoteId === note.id;

              return (
                <View key={note.id} style={styles.noteCard}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy || recorderState.isRecording}
                    onPress={() => {
                      void handleTogglePlayback(note);
                    }}
                    style={({ pressed }) => [
                      styles.iconButton,
                      isActive && playerStatus.playing
                        ? styles.iconButtonActive
                        : styles.iconButtonIdle,
                      (pressed || isBusy || recorderState.isRecording) &&
                        styles.actionPressed,
                    ]}
                  >
                    <Icon
                      color={
                        isActive && playerStatus.playing ? '#fff8ec' : '#3e2a1b'
                      }
                      name={isActive && playerStatus.playing ? 'pause' : 'play'}
                      size={20}
                    />
                  </Pressable>

                  <View style={styles.noteMeta}>
                    <View style={styles.noteTopline}>
                      <Text style={styles.noteTitle}>Voice note</Text>
                      <Text style={styles.noteDuration}>
                        {formatDuration(note.durationMillis)}
                      </Text>
                    </View>

                    <Text style={styles.noteSecondary}>
                      {formatDate(note.createdAt)} · {formatFileSize(note.sizeBytes)}
                    </Text>

                    {isActive ? (
                      <Text style={styles.notePlaybackStatus}>
                        {!playerStatus.isLoaded && queuedPlaybackId === note.id
                          ? 'Loading audio...'
                          : playerStatus.playing
                            ? `Playing ${formatPlaybackTime(playerStatus.currentTime)} / ${formatPlaybackTime(playerStatus.duration)}`
                            : 'Paused'}
                      </Text>
                    ) : null}
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy || recorderState.isRecording}
                    onPress={() => {
                      void handleDeleteNote(note);
                    }}
                    style={({ pressed }) => [
                      styles.deleteIconButton,
                      isDeleting && styles.deleteIconButtonBusy,
                      (pressed || isBusy || recorderState.isRecording) &&
                        styles.actionPressed,
                    ]}
                  >
                    {isDeleting ? (
                      <ActivityIndicator color="#8f2f24" size="small" />
                    ) : (
                      <Icon color="#8f2f24" name="trash-2" size={18} />
                    )}
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : currentTab === 'records' ? (
        <View style={styles.recordsContent}>
          <View style={styles.recordsPlaceholder}>
            <View style={styles.recordsIconWrap}>
              <Icon color="#7d6552" name="file-text" size={18} />
            </View>
            <Text style={styles.recordsTitle}>Records</Text>
            <Text style={styles.recordsBody}>
              Context sheets will appear here after processing is added.
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {!isSupabaseConfigured ? (
            <View style={styles.authConfigCard}>
              <Text style={styles.authConfigTitle}>Supabase setup required</Text>
              <Text style={styles.authConfigBody}>
                Add the project URL and anon key in `mobile/.env`, then enable Email
                auth in Supabase.
              </Text>
            </View>
          ) : null}

          <View style={styles.accountCard}>
            <View style={styles.accountHeader}>
              <View style={styles.accountHeaderIconWrap}>
                <Icon
                  color={accountSession ? '#fff8ec' : '#7d6552'}
                  name={accountSession ? 'check-circle' : 'mail'}
                  size={18}
                />
              </View>
              <View style={styles.accountHeaderCopy}>
                <Text style={styles.accountLabel}>
                  {accountSession ? 'Signed in' : 'Server account'}
                </Text>
                <Text style={styles.accountTitle}>
                  {accountSession ? accountEmail ?? 'Email account' : 'Email and password'}
                </Text>
              </View>
            </View>

            <Text style={styles.accountBody}>
              {accountSession
                ? 'This account will be used when you start syncing notes to Supabase. Local recording remains available either way.'
                : 'Create an account with email and password, or sign in with an existing one. Recording still stays local until sync is added.'}
            </Text>

            {authNotice ? <NoticeBanner notice={authNotice} /> : null}

            {accountSession ? (
              <>
                <View style={styles.accountDetails}>
                  <Text style={styles.accountDetailLabel}>Account email</Text>
                  <Text style={styles.accountDetailValue}>
                    {accountEmail ?? 'Email unavailable'}
                  </Text>
                </View>

                <View style={styles.accountDetails}>
                  <Text style={styles.accountDetailLabel}>Supabase user id</Text>
                  <Text style={styles.accountDetailValue}>
                    {shortenUserId(accountSession.user.id)}
                  </Text>
                </View>

                <View style={styles.accountDetails}>
                  <Text style={styles.accountDetailLabel}>Created</Text>
                  <Text style={styles.accountDetailValue}>
                    {formatDate(accountSession.user.created_at)}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={authAction === 'signout'}
                  onPress={() => {
                    void handleSignOut();
                  }}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    (pressed || authAction === 'signout') && styles.actionPressed,
                  ]}
                >
                  {authAction === 'signout' ? (
                    <ActivityIndicator color="#8f2f24" />
                  ) : (
                    <>
                      <Icon color="#8f2f24" name="log-out" size={16} />
                      <Text style={styles.secondaryButtonLabel}>Sign out</Text>
                    </>
                  )}
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    onChangeText={setEmailInput}
                    placeholder="name@example.com"
                    placeholderTextColor="#8f7b69"
                    style={styles.textInput}
                    value={emailInput}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setPasswordInput}
                    placeholder="At least 6 characters"
                    placeholderTextColor="#8f7b69"
                    secureTextEntry
                    style={styles.textInput}
                    textContentType="password"
                    value={passwordInput}
                  />
                </View>

                <Pressable
                  accessibilityRole="button"
                  disabled={authAction === 'signin'}
                  onPress={() => {
                    void handleSignIn();
                  }}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (pressed || authAction === 'signin') && styles.actionPressed,
                  ]}
                >
                  {authAction === 'signin' ? (
                    <ActivityIndicator color="#fff8ec" />
                  ) : (
                    <>
                      <Icon color="#fff8ec" name="mail" size={16} />
                      <Text style={styles.primaryButtonLabel}>Sign in</Text>
                    </>
                  )}
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  disabled={authAction === 'signup'}
                  onPress={() => {
                    void handleCreateAccount();
                  }}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    (pressed || authAction === 'signup') && styles.actionPressed,
                  ]}
                >
                  {authAction === 'signup' ? (
                    <ActivityIndicator color="#8f2f24" />
                  ) : (
                    <>
                      <Icon color="#8f2f24" name="user" size={16} />
                      <Text style={styles.secondaryButtonLabel}>Create account</Text>
                    </>
                  )}
                </Pressable>

                <Text style={styles.accountHint}>
                  Local notes stay on the device. For the smoothest development flow,
                  disable `Confirm email` in Supabase Email auth so new accounts can
                  sign in immediately.
                </Text>
              </>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function TabButton({
  icon,
  isActive,
  label,
  onPress,
}: {
  icon: 'mic' | 'file-text' | 'user';
  isActive: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabButton,
        isActive ? styles.tabButtonActive : styles.tabButtonIdle,
        pressed && styles.actionPressed,
      ]}
    >
      <View style={styles.tabButtonInner}>
        <Icon
          color={isActive ? '#231710' : '#6e5848'}
          name={icon}
          size={16}
        />
        <Text
          style={[
            styles.tabButtonLabel,
            isActive ? styles.tabButtonLabelActive : null,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function NoticeBanner({ notice }: { notice: AppNotice }) {
  return (
    <View
      style={[
        styles.noticeBanner,
        notice.tone === 'error'
          ? styles.noticeBannerError
          : notice.tone === 'success'
            ? styles.noticeBannerSuccess
            : styles.noticeBannerInfo,
      ]}
    >
      <Icon
        color={notice.tone === 'error' ? '#8f2f24' : '#3b5c4f'}
        name={notice.tone === 'error' ? 'alert-circle' : 'check-circle'}
        size={16}
      />
      <Text
        style={[
          styles.noticeText,
          notice.tone === 'error'
            ? styles.noticeTextError
            : styles.noticeTextSuccess,
        ]}
      >
        {notice.text}
      </Text>
    </View>
  );
}

function formatDuration(durationMillis: number) {
  const totalSeconds = Math.max(0, Math.round(durationMillis / 1000));
  return formatSeconds(totalSeconds);
}

function formatPlaybackTime(durationSeconds: number) {
  const totalSeconds = Math.max(0, Math.round(durationSeconds));
  return formatSeconds(totalSeconds);
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatFileSize(sizeBytes: number | null) {
  if (!sizeBytes) {
    return 'Size unavailable';
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(sizeBytes < 10 * 1024 ? 1 : 0)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function normalizeEmail(value: string) {
  const normalizedValue = value.trim().toLowerCase();

  if (!normalizedValue || !normalizedValue.includes('@')) {
    return null;
  }

  return normalizedValue;
}

function normalizePassword(value: string) {
  const normalizedValue = value.trim();

  if (normalizedValue.length < 6) {
    return null;
  }

  return normalizedValue;
}

function shortenUserId(value: string) {
  if (value.length <= 14) {
    return value;
  }

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#ece1cf',
    paddingTop: 56,
  },
  appBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  appBarStatus: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  appBarStatusLabel: {
    color: '#7d6552',
    fontSize: 13,
    fontWeight: '700',
  },
  appName: {
    color: '#20160f',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  appSubhead: {
    color: '#7d6552',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: 4,
    textTransform: 'uppercase',
  },
  tabs: {
    backgroundColor: '#e0d1bb',
    borderRadius: 20,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 20,
    marginTop: 20,
    padding: 6,
  },
  tabButton: {
    borderRadius: 16,
    flex: 1,
    paddingVertical: 12,
  },
  tabButtonInner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#fff8ec',
  },
  tabButtonIdle: {
    backgroundColor: 'transparent',
  },
  tabButtonLabel: {
    color: '#6e5848',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  tabButtonLabelActive: {
    color: '#231710',
  },
  contentScroll: {
    flex: 1,
  },
  content: {
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  recorderPanel: {
    backgroundColor: '#fff8ec',
    borderColor: '#d8c3a5',
    borderRadius: 28,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  recorderTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  panelLabel: {
    color: '#87684b',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  timer: {
    color: '#20160f',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginTop: 6,
  },
  recordAction: {
    alignItems: 'center',
    borderRadius: 24,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  recordActionStart: {
    backgroundColor: '#a33d30',
  },
  recordActionStop: {
    backgroundColor: '#62251d',
  },
  actionPressed: {
    opacity: 0.82,
  },
  recordActionLabel: {
    color: '#fff8ec',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  recorderHint: {
    color: '#6c5948',
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: '#8f2f24',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  syncPanel: {
    backgroundColor: '#fff8ec',
    borderColor: '#dcc7a9',
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 20,
  },
  syncTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  syncTitleWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  syncIconWrap: {
    alignItems: 'center',
    backgroundColor: '#e3d4bd',
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  syncTitle: {
    color: '#20160f',
    fontSize: 18,
    fontWeight: '700',
  },
  syncMeta: {
    color: '#7d6552',
    fontSize: 13,
    marginTop: 4,
  },
  syncButton: {
    alignItems: 'center',
    backgroundColor: '#9b3d2f',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  syncButtonLabel: {
    color: '#fff8ec',
    fontSize: 14,
    fontWeight: '700',
  },
  syncBody: {
    color: '#625244',
    fontSize: 15,
    lineHeight: 22,
  },
  noticeBanner: {
    alignItems: 'flex-start',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noticeBannerError: {
    backgroundColor: '#f3ddd3',
  },
  noticeBannerInfo: {
    backgroundColor: '#d9e6de',
  },
  noticeBannerSuccess: {
    backgroundColor: '#d9e6de',
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  noticeTextError: {
    color: '#8f2f24',
  },
  noticeTextSuccess: {
    color: '#335548',
  },
  sectionHeader: {
    paddingHorizontal: 2,
    paddingTop: 4,
  },
  sectionTitle: {
    color: '#20160f',
    fontSize: 22,
    fontWeight: '700',
  },
  sectionMeta: {
    color: '#7d6552',
    fontSize: 14,
    marginTop: 4,
  },
  emptyCard: {
    alignItems: 'flex-start',
    backgroundColor: '#f7eedf',
    borderRadius: 24,
    gap: 8,
    padding: 20,
  },
  emptyIconWrap: {
    alignItems: 'center',
    backgroundColor: '#e3d4bd',
    borderRadius: 14,
    height: 36,
    justifyContent: 'center',
    marginBottom: 4,
    width: 36,
  },
  emptyTitle: {
    color: '#20160f',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyBody: {
    color: '#625244',
    fontSize: 15,
    lineHeight: 22,
  },
  noteCard: {
    alignItems: 'center',
    backgroundColor: '#fff8ec',
    borderColor: '#dcc7a9',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 18,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  iconButtonIdle: {
    backgroundColor: '#e8dac2',
  },
  iconButtonActive: {
    backgroundColor: '#9b3d2f',
  },
  noteMeta: {
    flex: 1,
    gap: 6,
  },
  noteTopline: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteTitle: {
    color: '#20160f',
    fontSize: 17,
    fontWeight: '700',
  },
  noteDuration: {
    color: '#7d3529',
    fontSize: 18,
    fontWeight: '800',
  },
  noteSecondary: {
    color: '#625244',
    fontSize: 14,
    lineHeight: 20,
  },
  notePlaybackStatus: {
    color: '#8f2f24',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteIconButton: {
    alignItems: 'center',
    backgroundColor: '#f3ddd3',
    borderRadius: 16,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  deleteIconButtonBusy: {
    backgroundColor: '#e4c0b3',
  },
  recordsContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  recordsPlaceholder: {
    alignItems: 'flex-start',
    backgroundColor: '#fff8ec',
    borderColor: '#dcc7a9',
    borderRadius: 28,
    borderWidth: 1,
    gap: 10,
    padding: 24,
  },
  recordsIconWrap: {
    alignItems: 'center',
    backgroundColor: '#e3d4bd',
    borderRadius: 16,
    height: 40,
    justifyContent: 'center',
    marginBottom: 2,
    width: 40,
  },
  recordsTitle: {
    color: '#20160f',
    fontSize: 24,
    fontWeight: '700',
  },
  recordsBody: {
    color: '#625244',
    fontSize: 16,
    lineHeight: 24,
  },
  authConfigCard: {
    backgroundColor: '#f3ddd3',
    borderRadius: 24,
    gap: 8,
    padding: 20,
  },
  authConfigTitle: {
    color: '#62251d',
    fontSize: 18,
    fontWeight: '700',
  },
  authConfigBody: {
    color: '#7a392d',
    fontSize: 14,
    lineHeight: 22,
  },
  accountCard: {
    backgroundColor: '#fff8ec',
    borderColor: '#dcc7a9',
    borderRadius: 28,
    borderWidth: 1,
    gap: 16,
    padding: 20,
  },
  accountHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
  },
  accountHeaderIconWrap: {
    alignItems: 'center',
    backgroundColor: '#e3d4bd',
    borderRadius: 18,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  accountHeaderCopy: {
    flex: 1,
  },
  accountLabel: {
    color: '#87684b',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  accountTitle: {
    color: '#20160f',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  accountBody: {
    color: '#625244',
    fontSize: 15,
    lineHeight: 22,
  },
  accountDetails: {
    gap: 4,
  },
  accountDetailLabel: {
    color: '#87684b',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  accountDetailValue: {
    color: '#20160f',
    fontSize: 15,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    color: '#87684b',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#f7eedf',
    borderColor: '#dcc7a9',
    borderRadius: 18,
    borderWidth: 1,
    color: '#20160f',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#9b3d2f',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButtonLabel: {
    color: '#fff8ec',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#f3ddd3',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  secondaryButtonLabel: {
    color: '#8f2f24',
    fontSize: 15,
    fontWeight: '700',
  },
  accountHint: {
    color: '#6c5948',
    fontSize: 14,
    lineHeight: 20,
  },
});
