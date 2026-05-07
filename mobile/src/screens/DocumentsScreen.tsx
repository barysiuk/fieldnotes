import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { createContextSheet, listContextSheets } from '../lib/contextSheets';
import { formatDate } from '../lib/voiceNoteUi';
import type { ContextSheet, VoiceNote } from '../types';
import type { AppNotice } from '../ui/NoticeBanner';
import { NoticeBanner } from '../ui/NoticeBanner';
import { Icon } from '../ui/Icon';

function getContextSheetSummary(sheet: ContextSheet) {
  const siteParts = [sheet.data.site.code, sheet.data.site.name].filter(Boolean);
  const siteLabel = siteParts.join(' ');

  if (siteLabel && sheet.data.contextNumber) {
    return `${siteLabel} - Context ${sheet.data.contextNumber}`;
  }

  if (siteLabel) {
    return siteLabel;
  }

  if (sheet.data.contextNumber) {
    return `Context ${sheet.data.contextNumber}`;
  }

  return 'Structured context sheet';
}

function getReadyNotes(notes: VoiceNote[]) {
  return notes.filter(
    (note) =>
      note.processingStatus === 'complete' &&
      note.syncStatus === 'synced' &&
      Boolean(note.remoteNoteId)
  );
}

export function DocumentsScreen({
  accountConnected,
  isSupabaseConfigured,
  notes,
  onOpenContextSheet,
}: {
  accountConnected: boolean;
  isSupabaseConfigured: boolean;
  notes: VoiceNote[];
  onOpenContextSheet: (sheet: ContextSheet) => void;
}) {
  const [contextSheets, setContextSheets] = useState<ContextSheet[]>([]);
  const [isLoadingSheets, setIsLoadingSheets] = useState(accountConnected);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [notice, setNotice] = useState<AppNotice | null>(null);
  const readyNotes = useMemo(() => getReadyNotes(notes), [notes]);

  async function refreshContextSheets() {
    const loadedSheets = await listContextSheets();
    setContextSheets(loadedSheets);
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !accountConnected) {
      setContextSheets([]);
      setIsLoadingSheets(false);
      return;
    }

    let isMounted = true;

    async function loadSheets() {
      setIsLoadingSheets(true);

      try {
        const loadedSheets = await listContextSheets();

        if (isMounted) {
          setContextSheets(loadedSheets);
        }
      } catch (error) {
        if (isMounted) {
          setNotice({
            tone: 'error',
            text:
              error instanceof Error
                ? error.message
                : 'Could not load context sheets from the server.',
          });
        }
      } finally {
        if (isMounted) {
          setIsLoadingSheets(false);
        }
      }
    }

    void loadSheets();

    return () => {
      isMounted = false;
    };
  }, [accountConnected, isSupabaseConfigured]);

  function toggleSelectedNote(noteId: string) {
    setSelectedNoteIds((currentIds) =>
      currentIds.includes(noteId)
        ? currentIds.filter((currentId) => currentId !== noteId)
        : [...currentIds, noteId]
    );
  }

  async function handleCreateContextSheet() {
    const selectedRemoteNoteIds = readyNotes
      .filter((note) => selectedNoteIds.includes(note.id))
      .map((note) => note.remoteNoteId)
      .filter((noteId): noteId is string => Boolean(noteId));

    if (selectedRemoteNoteIds.length === 0) {
      setNotice({
        tone: 'error',
        text: 'Pick at least one processed note before creating a context sheet.',
      });
      return;
    }

    setNotice(null);
    setIsCreating(true);

    try {
      await createContextSheet(selectedRemoteNoteIds);
      await refreshContextSheets();
      setSelectedNoteIds([]);
      setIsCreateOpen(false);
      setNotice({
        tone: 'success',
        text: 'Context sheet created from the selected processed notes.',
      });
    } catch (error) {
      setNotice({
        tone: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'The server could not create this context sheet.',
      });
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Context sheets</Text>
          <Text style={styles.sectionMeta}>
            {contextSheets.length === 1
              ? '1 saved context sheet'
              : `${contextSheets.length} saved context sheets`}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={
            !isSupabaseConfigured || !accountConnected || readyNotes.length === 0 || isCreating
          }
          onPress={() => {
            setNotice(null);
            setIsCreateOpen((currentValue) => !currentValue);
          }}
          style={({ pressed }) => [
            styles.createButton,
            (!isSupabaseConfigured ||
              !accountConnected ||
              readyNotes.length === 0 ||
              isCreating) &&
              styles.createButtonDisabled,
            pressed && styles.actionPressed,
          ]}
        >
          {isCreating ? (
            <ActivityIndicator color="#fff7ef" size="small" />
          ) : (
            <>
              <Icon color="#fff7ef" name="plus" size={14} />
              <Text style={styles.createButtonLabel}>Create</Text>
            </>
          )}
        </Pressable>
      </View>

      {notice ? <NoticeBanner notice={notice} /> : null}

      {!isSupabaseConfigured ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Supabase is not configured yet</Text>
          <Text style={styles.infoBody}>
            Add the project URL and anon key before creating or reading context sheets.
          </Text>
        </View>
      ) : !accountConnected ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Sign in to access context sheets</Text>
          <Text style={styles.infoBody}>
            The app stores these records per account, so the Documents tab stays read-only
            until you sign in.
          </Text>
        </View>
      ) : null}

      {isCreateOpen ? (
        <View style={styles.selectionCard}>
          <View style={styles.selectionHeader}>
            <View>
              <Text style={styles.selectionTitle}>Select processed notes</Text>
              <Text style={styles.selectionMeta}>
                The server will combine them oldest-first before generating the sheet.
              </Text>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setSelectedNoteIds([]);
                setIsCreateOpen(false);
              }}
              style={({ pressed }) => [pressed && styles.actionPressed]}
            >
              <Icon color="#735e50" name="x" size={18} />
            </Pressable>
          </View>

          {readyNotes.length === 0 ? (
            <Text style={styles.selectionEmpty}>
              No fully processed notes are available yet.
            </Text>
          ) : (
            readyNotes
              .slice()
              .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
              .map((note) => {
                const isSelected = selectedNoteIds.includes(note.id);

                return (
                  <Pressable
                    key={note.id}
                    accessibilityRole="button"
                    onPress={() => {
                      toggleSelectedNote(note.id);
                    }}
                    style={({ pressed }) => [
                      styles.noteSelectionCard,
                      isSelected && styles.noteSelectionCardSelected,
                      pressed && styles.actionPressed,
                    ]}
                  >
                    <View style={styles.noteSelectionHeader}>
                      <Text style={styles.noteSelectionDate}>
                        {formatDate(note.createdAt)}
                      </Text>
                      <View
                        style={[
                          styles.checkbox,
                          isSelected ? styles.checkboxSelected : null,
                        ]}
                      >
                        {isSelected ? (
                          <Icon color="#fff7ef" name="check" size={12} />
                        ) : null}
                      </View>
                    </View>

                    <Text numberOfLines={3} style={styles.noteSelectionText}>
                      {note.transcriptText || 'Transcript unavailable.'}
                    </Text>
                  </Pressable>
                );
              })
          )}

          <Pressable
            accessibilityRole="button"
            disabled={isCreating || selectedNoteIds.length === 0}
            onPress={() => {
              void handleCreateContextSheet();
            }}
            style={({ pressed }) => [
              styles.generateButton,
              (isCreating || selectedNoteIds.length === 0) && styles.generateButtonDisabled,
              pressed && styles.actionPressed,
            ]}
          >
            {isCreating ? (
              <ActivityIndicator color="#fff7ef" size="small" />
            ) : (
              <Text style={styles.generateButtonLabel}>
                Generate from {selectedNoteIds.length}{' '}
                {selectedNoteIds.length === 1 ? 'note' : 'notes'}
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}

      {isLoadingSheets ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#ab4d38" size="small" />
          <Text style={styles.loadingText}>Loading context sheets...</Text>
        </View>
      ) : contextSheets.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconWrap}>
            <Icon color="#6f5a4b" name="book-open" size={18} />
          </View>
          <Text style={styles.emptyTitle}>No context sheets yet</Text>
          <Text style={styles.emptyBody}>
            Create one from processed notes and it will appear here.
          </Text>
        </View>
      ) : (
        contextSheets.map((sheet) => (
          <View key={sheet.id} style={styles.sheetCard}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onOpenContextSheet(sheet);
              }}
              style={({ pressed }) => [
                styles.sheetMain,
                pressed && styles.actionPressed,
              ]}
            >
              <View style={styles.sheetInfo}>
                <View style={styles.sheetHeadlineRow}>
                  <Text style={styles.sheetTitle}>{sheet.title}</Text>
                  <Text style={styles.sheetMetaText}>{formatDate(sheet.createdAt)}</Text>
                </View>

                <View style={styles.sheetFooterRow}>
                  <Text style={styles.sheetSummary}>{getContextSheetSummary(sheet)}</Text>
                  <Text style={styles.sheetSourceMeta}>
                    {sheet.noteCount} {sheet.noteCount === 1 ? 'source note' : 'source notes'}
                  </Text>
                </View>

                <View style={styles.sheetPreviewWrap}>
                  <Text numberOfLines={2} style={styles.sheetPreview}>
                    {sheet.data.description ||
                      'No description was extracted into this context sheet yet.'}
                  </Text>
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
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  createButton: {
    alignItems: 'center',
    backgroundColor: '#ab4d38',
    borderRadius: 14,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 14,
  },
  createButtonDisabled: {
    opacity: 0.45,
  },
  createButtonLabel: {
    color: '#fff7ef',
    fontSize: 13,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#fff7ef',
    borderRadius: 24,
    gap: 6,
    padding: 18,
  },
  infoTitle: {
    color: '#201713',
    fontSize: 16,
    fontWeight: '800',
  },
  infoBody: {
    color: '#715d50',
    fontSize: 14,
    lineHeight: 20,
  },
  selectionCard: {
    backgroundColor: 'rgba(255, 247, 239, 0.94)',
    borderColor: 'rgba(170, 143, 126, 0.2)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  selectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectionTitle: {
    color: '#201713',
    fontSize: 18,
    fontWeight: '800',
  },
  selectionMeta: {
    color: '#7a6557',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    maxWidth: 260,
  },
  selectionEmpty: {
    color: '#7a6557',
    fontSize: 14,
    lineHeight: 20,
  },
  noteSelectionCard: {
    backgroundColor: '#fffdfa',
    borderColor: 'rgba(171, 77, 56, 0.12)',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  noteSelectionCardSelected: {
    borderColor: '#ab4d38',
    borderWidth: 1.5,
  },
  noteSelectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteSelectionDate: {
    color: '#5d4a40',
    fontSize: 13,
    fontWeight: '700',
  },
  checkbox: {
    alignItems: 'center',
    borderColor: '#cbb2a5',
    borderRadius: 999,
    borderWidth: 1,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  checkboxSelected: {
    backgroundColor: '#ab4d38',
    borderColor: '#ab4d38',
  },
  noteSelectionText: {
    color: '#332724',
    fontSize: 14,
    lineHeight: 20,
  },
  generateButton: {
    alignItems: 'center',
    backgroundColor: '#93422f',
    borderRadius: 16,
    justifyContent: 'center',
    minHeight: 46,
    marginTop: 4,
  },
  generateButtonDisabled: {
    opacity: 0.45,
  },
  generateButtonLabel: {
    color: '#fff7ef',
    fontSize: 14,
    fontWeight: '800',
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: '#fff7ef',
    borderRadius: 22,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  loadingText: {
    color: '#6e594d',
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 250, 245, 0.92)',
    borderColor: 'rgba(170, 143, 126, 0.18)',
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  emptyIconWrap: {
    alignItems: 'center',
    backgroundColor: '#efe3d6',
    borderRadius: 16,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  emptyTitle: {
    color: '#201713',
    fontSize: 16,
    fontWeight: '800',
  },
  emptyBody: {
    color: '#715d50',
    fontSize: 14,
    lineHeight: 20,
  },
  sheetCard: {
    backgroundColor: 'rgba(255, 250, 245, 0.92)',
    borderColor: 'rgba(170, 143, 126, 0.18)',
    borderRadius: 22,
    borderWidth: 1,
  },
  sheetMain: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  sheetInfo: {
    flex: 1,
  },
  sheetHeadlineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    color: '#1f1614',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    paddingRight: 8,
  },
  sheetMetaText: {
    color: '#7f6a5d',
    fontSize: 12,
    fontWeight: '600',
  },
  sheetFooterRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sheetSummary: {
    color: '#6b5549',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  sheetSourceMeta: {
    color: '#7d685b',
    fontSize: 12,
    fontWeight: '600',
  },
  sheetPreviewWrap: {
    marginTop: 10,
  },
  sheetPreview: {
    color: '#362926',
    fontSize: 14,
    lineHeight: 20,
  },
  actionPressed: {
    opacity: 0.82,
  },
});
