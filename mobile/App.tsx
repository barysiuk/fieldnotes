import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

import {
  deleteVoiceNote,
  initializeVoiceNotesStore,
  listVoiceNotes,
  persistVoiceNote,
} from './src/lib/voiceNotes';
import type { VoiceNote } from './src/types';
import { Icon } from './src/ui/Icon';

type AppTab = 'notes' | 'records';

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

  const activeNote = activeNoteId
    ? savedNotes.find((note) => note.id === activeNoteId) ?? null
    : null;
  const player = useAudioPlayer(activeNote ? { uri: activeNote.fileUri } : null, {
    keepAudioSessionActive: true,
    updateInterval: 250,
  });
  const playerStatus = useAudioPlayerStatus(player);

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

  const isBusy = isLoading || isSaving || deletingNoteId !== null;
  const noteCountLabel =
    savedNotes.length === 1 ? '1 note' : `${savedNotes.length} notes`;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />

      <View style={styles.appBar}>
        <View>
          <Text style={styles.appName}>FieldNotes</Text>
          <Text style={styles.appSubhead}>Field capture</Text>
        </View>
        {isBusy ? <ActivityIndicator color="#9b3d2f" /> : null}
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
      ) : (
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
  icon: 'mic' | 'file-text';
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
});
