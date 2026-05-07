import type { VoiceNote } from '../types';

export type SyncRunState = {
  noteIds: string[];
  startedAt: string;
  total: number;
};

export function formatDuration(durationMillis: number) {
  const totalSeconds = Math.max(0, Math.round(durationMillis / 1000));
  return formatSeconds(totalSeconds);
}

export function formatPlaybackTime(durationSeconds: number) {
  const totalSeconds = Math.max(0, Math.round(durationSeconds));
  return formatSeconds(totalSeconds);
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function formatHeaderDate(value: Date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
  }).format(value);
}

export function formatFileSize(sizeBytes: number | null) {
  if (!sizeBytes) {
    return 'Size unavailable';
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(sizeBytes < 10 * 1024 ? 1 : 0)} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getPlaybackProgress(
  currentTimeSeconds: number,
  durationSeconds: number
) {
  if (!durationSeconds || durationSeconds <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (currentTimeSeconds / durationSeconds) * 100));
}

export function isVoiceNotePendingSync(note: VoiceNote) {
  return note.syncStatus !== 'synced' || note.processingStatus !== 'complete';
}

export function getVoiceNoteStatusLabel(note: VoiceNote) {
  if (note.syncStatus === 'uploading') {
    return 'Uploading';
  }

  if (note.processingStatus === 'transcribing') {
    return 'Transcribing';
  }

  if (note.processingStatus === 'failed' || note.syncStatus === 'failed') {
    return 'Needs retry';
  }

  if (note.syncStatus === 'uploaded') {
    return 'Uploaded';
  }

  if (note.processingStatus === 'complete' && note.syncStatus === 'synced') {
    return 'Synced';
  }

  return 'Waiting to sync';
}

export function getStatusIconName(note: VoiceNote) {
  if (note.processingStatus === 'failed' || note.syncStatus === 'failed') {
    return 'alert-circle' as const;
  }

  if (note.processingStatus === 'complete' && note.syncStatus === 'synced') {
    return 'check' as const;
  }

  if (note.syncStatus === 'uploaded') {
    return 'cloud' as const;
  }

  return 'refresh-cw' as const;
}

export function getStatusIconColor(note: VoiceNote) {
  if (note.processingStatus === 'failed' || note.syncStatus === 'failed') {
    return '#9d4333';
  }

  if (note.processingStatus === 'complete' && note.syncStatus === 'synced') {
    return '#1f6b48';
  }

  if (note.syncStatus === 'uploaded') {
    return '#fff7ef';
  }

  return '#4d3024';
}

export function getSyncingNoteStatusText(note: VoiceNote) {
  if (note.syncStatus === 'uploading') {
    return 'Uploading the current note to the server...';
  }

  if (note.processingStatus === 'transcribing') {
    return 'Running transcription for the current note...';
  }

  return 'Preparing notes for sync...';
}

export function getSyncProgressLabel(
  notes: VoiceNote[],
  syncRunState: SyncRunState | null,
  isSyncing: boolean
) {
  if (!syncRunState || !isSyncing) {
    return null;
  }

  const noteMap = new Map(notes.map((note) => [note.id, note]));
  const processedCount = syncRunState.noteIds.reduce((count, noteId) => {
    const note = noteMap.get(noteId);

    if (!note) {
      return count;
    }

    const updatedDuringRun = note.updatedAt >= syncRunState.startedAt;
    const completed =
      note.processingStatus === 'complete' && note.syncStatus === 'synced';
    const failed =
      note.processingStatus === 'failed' || note.syncStatus === 'failed';

    return count + (updatedDuringRun && (completed || failed) ? 1 : 0);
  }, 0);

  const activeStep = Math.min(
    syncRunState.total,
    processedCount +
      (notes.some(
        (note) =>
          syncRunState.noteIds.includes(note.id) &&
          (note.syncStatus === 'uploading' ||
            note.processingStatus === 'transcribing')
      )
        ? 1
        : 0)
  );

  return `Syncing ${Math.max(1, activeStep)} of ${syncRunState.total}`;
}
