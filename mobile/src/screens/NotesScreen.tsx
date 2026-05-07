import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getStatusIconColor, getStatusIconName, getSyncingNoteStatusText, getVoiceNoteStatusLabel, formatDate, formatDuration } from '../lib/voiceNoteUi';
import type { VoiceNote } from '../types';
import type { AppNotice } from '../ui/NoticeBanner';
import { NoticeBanner } from '../ui/NoticeBanner';
import { Icon } from '../ui/Icon';

export function NotesScreen({
  accountConnected,
  activeSyncNote,
  isAuthBusy,
  isBusy,
  isRecording,
  isSyncing,
  noteCountLabel,
  notes,
  onOpenNote,
  onSyncPress,
  pendingSyncCount,
  pendingSyncLabel,
  shouldShowSyncPanel,
  syncNotice,
  syncProgressLabel,
}: {
  accountConnected: boolean;
  activeSyncNote: VoiceNote | null;
  isAuthBusy: boolean;
  isBusy: boolean;
  isRecording: boolean;
  isSyncing: boolean;
  noteCountLabel: string;
  notes: VoiceNote[];
  onOpenNote: (noteId: string) => void;
  onSyncPress: () => void;
  pendingSyncCount: number;
  pendingSyncLabel: string;
  shouldShowSyncPanel: boolean;
  syncNotice: AppNotice | null;
  syncProgressLabel: string | null;
}) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Voice notes</Text>
          <Text style={styles.sectionMeta}>{noteCountLabel}</Text>
        </View>
      </View>

      {shouldShowSyncPanel ? (
        <View style={styles.syncCardCompact}>
          <View style={styles.syncCompactHeader}>
            <View style={styles.syncTitleWrap}>
              <View
                style={[
                  styles.syncIconWrapCompact,
                  isSyncing ? styles.syncIconWrapActive : null,
                ]}
              >
                {isSyncing ? (
                  <ActivityIndicator color="#fff7ef" size="small" />
                ) : (
                  <Icon color="#4d3024" name="refresh-cw" size={15} />
                )}
              </View>

              <View style={styles.syncTitleCopy}>
                <Text style={styles.syncTitleCompact}>
                  {isSyncing ? syncProgressLabel ?? 'Syncing notes' : pendingSyncLabel}
                </Text>
                {activeSyncNote ? (
                  <Text style={styles.syncMetaCompact}>
                    {getSyncingNoteStatusText(activeSyncNote)}
                  </Text>
                ) : !accountConnected && pendingSyncCount > 0 ? (
                  <Text style={styles.syncMetaCompact}>
                    Sign in when you want to upload these notes.
                  </Text>
                ) : null}
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={isBusy || isAuthBusy}
              onPress={onSyncPress}
              style={({ pressed }) => [
                styles.syncButtonCompact,
                (pressed || isBusy || isAuthBusy) && styles.actionPressed,
              ]}
            >
              {isSyncing ? (
                <ActivityIndicator color="#fff7ef" size="small" />
              ) : (
                <Text style={styles.syncButtonLabel}>
                  {accountConnected ? 'Sync' : 'Sign in'}
                </Text>
              )}
            </Pressable>
          </View>

          {syncNotice ? <NoticeBanner notice={syncNotice} /> : null}
        </View>
      ) : null}

      {notes.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Icon color="#6f5a4b" name="mic" size={18} />
          </View>
          <Text style={styles.emptyTitle}>Nothing captured yet</Text>
          <Text style={styles.emptyBody}>
            Start a recording from the button below and it will appear here.
          </Text>
        </View>
      ) : (
        notes.map((note) => (
          <View key={note.id} style={styles.noteCard}>
            <Pressable
              accessibilityRole="button"
              disabled={isBusy || isRecording}
              onPress={() => {
                onOpenNote(note.id);
              }}
              style={({ pressed }) => [
                styles.noteMain,
                (pressed || isBusy || isRecording) && styles.actionPressed,
              ]}
            >
              <View style={styles.noteInfo}>
                <View style={styles.noteHeadlineRow}>
                  <Text style={styles.noteTitle}>Voice note</Text>
                  <Text style={styles.noteMetaText}>{formatDate(note.createdAt)}</Text>
                </View>

                <View style={styles.noteFooter}>
                  <Text style={styles.noteDuration}>
                    {formatDuration(note.durationMillis)}
                  </Text>

                  <View style={styles.noteStatusInline}>
                    {note.syncStatus === 'uploading' ||
                    note.processingStatus === 'transcribing' ? (
                      <ActivityIndicator
                        color={getStatusIconColor(note)}
                        size="small"
                      />
                    ) : (
                      <Icon
                        color={getStatusIconColor(note)}
                        name={getStatusIconName(note)}
                        size={13}
                      />
                    )}
                    <Text style={styles.noteStatusInlineText}>
                      {getVoiceNoteStatusLabel(note)}
                    </Text>
                  </View>
                </View>

                <View style={styles.noteTranscriptPreviewWrap}>
                  {note.transcriptText ? (
                    <Text numberOfLines={2} style={styles.noteTranscriptPreview}>
                      {note.transcriptText}
                    </Text>
                  ) : null}
                </View>
              </View>

              <Icon color="#8a7668" name="chevron-right" size={18} />
            </Pressable>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    gap: 12,
    paddingBottom: 144,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  sectionHeader: {
    paddingTop: 4,
  },
  sectionTitle: {
    color: '#1f1614',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  sectionMeta: {
    color: '#7d685b',
    fontSize: 14,
    marginTop: 4,
  },
  syncCardCompact: {
    backgroundColor: 'rgba(255, 247, 239, 0.94)',
    borderColor: 'rgba(170, 143, 126, 0.2)',
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  syncCompactHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  syncTitleWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  syncIconWrapCompact: {
    alignItems: 'center',
    backgroundColor: '#f0e4d8',
    borderRadius: 14,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  syncIconWrapActive: {
    backgroundColor: '#b5533d',
  },
  syncTitleCopy: {
    flex: 1,
    gap: 2,
  },
  syncTitleCompact: {
    color: '#201713',
    fontSize: 14,
    fontWeight: '700',
  },
  syncMetaCompact: {
    color: '#7a6557',
    fontSize: 12,
    lineHeight: 16,
  },
  syncButtonCompact: {
    alignItems: 'center',
    backgroundColor: '#ab4d38',
    borderRadius: 14,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 14,
  },
  syncButtonLabel: {
    color: '#fff7ef',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 247, 239, 0.94)',
    borderColor: 'rgba(170, 143, 126, 0.18)',
    borderRadius: 26,
    borderWidth: 1,
    gap: 10,
    padding: 20,
  },
  emptyIconWrap: {
    alignItems: 'center',
    backgroundColor: '#efe3d5',
    borderRadius: 14,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  emptyTitle: {
    color: '#1f1614',
    fontSize: 18,
    fontWeight: '700',
  },
  emptyBody: {
    color: '#675349',
    fontSize: 15,
    lineHeight: 22,
  },
  noteCard: {
    backgroundColor: 'rgba(255, 250, 245, 0.92)',
    borderColor: 'rgba(170, 143, 126, 0.18)',
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  noteMain: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  noteInfo: {
    flex: 1,
    gap: 5,
  },
  noteHeadlineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteTitle: {
    color: '#1f1614',
    fontSize: 15,
    fontWeight: '700',
  },
  noteMetaText: {
    color: '#6d584c',
    fontSize: 12,
    lineHeight: 16,
  },
  noteFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  noteDuration: {
    color: '#7a6557',
    fontSize: 12,
    fontWeight: '700',
  },
  noteStatusInline: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  noteStatusInlineText: {
    color: '#4f3f35',
    fontSize: 12,
    fontWeight: '700',
  },
  noteTranscriptPreviewWrap: {
    justifyContent: 'flex-start',
    minHeight: 34,
  },
  noteTranscriptPreview: {
    color: '#9a887c',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  actionPressed: {
    opacity: 0.82,
  },
});
