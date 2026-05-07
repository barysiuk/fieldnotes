import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { formatDate, formatFileSize, formatPlaybackTime, getStatusIconColor, getStatusIconName, getVoiceNoteStatusLabel } from '../lib/voiceNoteUi';
import type { VoiceNote } from '../types';
import type { AppNotice } from './NoticeBanner';
import { NoticeBanner } from './NoticeBanner';
import { Icon } from './Icon';

export function NoteDetailSheet({
  deletingNoteId,
  errorNotice,
  isBusy,
  isRecording,
  isPlaying,
  isPlayerLoaded,
  note,
  onClose,
  onDelete,
  onTogglePlayback,
  playbackDuration,
  playbackProgress,
  playbackTime,
  queuedPlaybackId,
}: {
  deletingNoteId: string | null;
  errorNotice: AppNotice | null;
  isBusy: boolean;
  isPlayerLoaded: boolean;
  isPlaying: boolean;
  isRecording: boolean;
  note: VoiceNote | null;
  onClose: () => void;
  onDelete: (note: VoiceNote) => void;
  onTogglePlayback: (note: VoiceNote) => void;
  playbackDuration: number;
  playbackProgress: number;
  playbackTime: number;
  queuedPlaybackId: string | null;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={Boolean(note)}>
      <SafeAreaProvider>
        <SafeAreaView edges={['top']} style={styles.screen}>
          <StatusBar style="dark" />

          {note ? (
            <>
              <View style={styles.header}>
                <View>
                  <Text style={styles.eyebrow}>Voice note</Text>
                  <Text style={styles.title}>Playback</Text>
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
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.hero}>
                  <Text style={styles.noteTitle}>Voice note</Text>
                  <Text style={styles.noteMeta}>
                    {formatDate(note.createdAt)} · {formatFileSize(note.sizeBytes)}
                  </Text>

                  <View style={styles.statusRow}>
                    {note.syncStatus === 'uploading' ||
                    note.processingStatus === 'transcribing' ? (
                      <ActivityIndicator color={getStatusIconColor(note)} size="small" />
                    ) : (
                      <Icon
                        color={getStatusIconColor(note)}
                        name={getStatusIconName(note)}
                        size={14}
                      />
                    )}
                    <Text style={styles.statusText}>{getVoiceNoteStatusLabel(note)}</Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    disabled={isBusy || isRecording}
                    onPress={() => {
                      onTogglePlayback(note);
                    }}
                    style={({ pressed }) => [
                      styles.playButton,
                      (pressed || isBusy || isRecording) && styles.actionPressed,
                    ]}
                  >
                    <Icon color="#fff7ef" name={isPlaying ? 'pause' : 'play'} size={22} />
                    <Text style={styles.playLabel}>{isPlaying ? 'Pause' : 'Play'}</Text>
                  </Pressable>

                  {(isPlaying || queuedPlaybackId === note.id) ? (
                    <View style={styles.playback}>
                      <Text style={styles.playbackStatus}>
                        {!isPlayerLoaded && queuedPlaybackId === note.id
                          ? 'Loading audio...'
                          : isPlaying
                            ? `Playing ${formatPlaybackTime(playbackTime)} / ${formatPlaybackTime(playbackDuration)}`
                            : 'Paused'}
                      </Text>
                      <View style={styles.playbackTrack}>
                        <View
                          style={[
                            styles.playbackFill,
                            { width: `${playbackProgress}%` },
                          ]}
                        />
                      </View>
                    </View>
                  ) : null}
                </View>

                {note.transcriptText ? (
                  <View style={styles.card}>
                    <Text style={styles.cardLabel}>Transcript</Text>
                    <Text style={styles.transcriptText}>{note.transcriptText}</Text>
                  </View>
                ) : (
                  <View style={styles.card}>
                    <Text style={styles.cardLabel}>Transcript</Text>
                    <Text style={styles.placeholderText}>
                      This note will show transcript text after sync and processing.
                    </Text>
                  </View>
                )}

                {note.lastError ? (
                  <NoticeBanner notice={{ tone: 'error', text: note.lastError }} />
                ) : errorNotice ? (
                  <NoticeBanner notice={errorNotice} />
                ) : null}

                <Pressable
                  accessibilityRole="button"
                  disabled={isBusy || isRecording}
                  onPress={() => {
                    onDelete(note);
                  }}
                  style={({ pressed }) => [
                    styles.deleteButton,
                    (pressed || isBusy || isRecording) && styles.actionPressed,
                  ]}
                >
                  {deletingNoteId === note.id ? (
                    <ActivityIndicator color="#9d4333" size="small" />
                  ) : (
                    <>
                      <Icon color="#9d4333" name="trash-2" size={16} />
                      <Text style={styles.deleteLabel}>Delete note</Text>
                    </>
                  )}
                </Pressable>
              </ScrollView>
            </>
          ) : null}
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
    gap: 16,
    paddingBottom: 36,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 250, 245, 0.92)',
    borderColor: 'rgba(170, 143, 126, 0.18)',
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 22,
  },
  noteTitle: {
    color: '#1d1512',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  noteMeta: {
    color: '#6d584c',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  statusText: {
    color: '#4f3f35',
    fontSize: 14,
    fontWeight: '700',
  },
  playButton: {
    alignItems: 'center',
    backgroundColor: '#ab4d38',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 54,
    paddingHorizontal: 24,
  },
  playLabel: {
    color: '#fff7ef',
    fontSize: 15,
    fontWeight: '700',
  },
  playback: {
    gap: 10,
    width: '100%',
  },
  playbackStatus: {
    color: '#8d4334',
    fontSize: 13,
    fontWeight: '700',
  },
  playbackTrack: {
    backgroundColor: '#eadfd3',
    borderRadius: 999,
    height: 6,
    overflow: 'hidden',
    width: '100%',
  },
  playbackFill: {
    backgroundColor: '#ab4d38',
    borderRadius: 999,
    height: '100%',
  },
  card: {
    backgroundColor: 'rgba(255, 250, 245, 0.92)',
    borderColor: 'rgba(170, 143, 126, 0.18)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  cardLabel: {
    color: '#8c7566',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  transcriptText: {
    color: '#1f1614',
    fontSize: 15,
    lineHeight: 22,
  },
  placeholderText: {
    color: '#6d584c',
    fontSize: 15,
    lineHeight: 22,
  },
  deleteButton: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: '#f4e3dd',
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  deleteLabel: {
    color: '#9d4333',
    fontSize: 15,
    fontWeight: '700',
  },
  actionPressed: {
    opacity: 0.82,
  },
});
