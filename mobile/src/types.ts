export type VoiceNoteSyncStatus =
  | 'pending_upload'
  | 'uploading'
  | 'uploaded'
  | 'synced'
  | 'failed';

export type VoiceNoteProcessingStatus =
  | 'not_started'
  | 'transcribing'
  | 'complete'
  | 'failed';

export type VoiceNote = {
  id: string;
  fileUri: string;
  createdAt: string;
  durationMillis: number;
  sizeBytes: number | null;
  syncStatus: VoiceNoteSyncStatus;
  processingStatus: VoiceNoteProcessingStatus;
  storagePath: string | null;
  transcriptText: string | null;
  remoteNoteId: string | null;
  lastError: string | null;
  retryCount: number;
  updatedAt: string;
};
