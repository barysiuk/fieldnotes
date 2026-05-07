import { File as ExpoFile } from 'expo-file-system';
import NetInfo from '@react-native-community/netinfo';
import { FunctionsHttpError } from '@supabase/supabase-js';

import type { VoiceNote, VoiceNoteProcessingStatus, VoiceNoteSyncStatus } from '../types';
import { getSupabaseClient } from './supabase';
import { listSyncableVoiceNotes, updateVoiceNote } from './voiceNotes';

type ProcessNoteResponse = {
  noteId: string;
  transcriptText: string;
};

type ProcessNoteErrorResponse = {
  error?: string;
  stage?: string;
};

export type VoiceNoteSyncRunResult = {
  failedCount: number;
  status: 'failed' | 'noop' | 'partial' | 'success';
  syncedCount: number;
  totalCount: number;
};

const STORAGE_BUCKET_NAME =
  process.env.EXPO_PUBLIC_FIELDNOTES_NOTES_BUCKET?.trim() || 'voice-notes';
const PROCESS_NOTE_FUNCTION_NAME =
  process.env.EXPO_PUBLIC_SUPABASE_PROCESS_NOTE_FUNCTION?.trim() || 'process-note';

function getFileExtension(uri: string) {
  const cleanUri = uri.split('?')[0] ?? uri;
  return cleanUri.split('.').pop()?.trim().toLowerCase() || 'm4a';
}

function getStoragePath(userId: string, note: VoiceNote) {
  return `${userId}/${note.id}/original.${getFileExtension(note.fileUri)}`;
}

function getAudioMimeType(uri: string) {
  switch (getFileExtension(uri)) {
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'webm':
      return 'audio/webm';
    case 'm4a':
    case 'mp4':
      return 'audio/mp4';
    default:
      return 'application/octet-stream';
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function getFailureState(uploadCompleted: boolean): {
  processingStatus: VoiceNoteProcessingStatus;
  syncStatus: VoiceNoteSyncStatus;
} {
  if (uploadCompleted) {
    return {
      syncStatus: 'uploaded',
      processingStatus: 'failed',
    };
  }

  return {
    syncStatus: 'failed',
    processingStatus: 'not_started',
  };
}

async function uploadVoiceNoteAudio(note: VoiceNote, storagePath: string) {
  const client = getSupabaseClient();
  const localFile = new ExpoFile(note.fileUri);

  if (!localFile.exists) {
    throw new Error('The local recording file is missing from the device.');
  }

  const audioBytes = await localFile.arrayBuffer();
  const { error } = await client.storage.from(STORAGE_BUCKET_NAME).upload(
    storagePath,
    audioBytes,
    {
      contentType: getAudioMimeType(note.fileUri),
      upsert: true,
    }
  );

  if (error) {
    throw new Error(`Upload failed: ${getErrorMessage(error, 'Storage rejected the file.')}`);
  }
}

async function processUploadedVoiceNote(note: VoiceNote, storagePath: string) {
  const client = getSupabaseClient();
  const { data, error } = await client.functions.invoke<ProcessNoteResponse>(
    PROCESS_NOTE_FUNCTION_NAME,
    {
      body: {
        clientNoteId: note.id,
        createdAt: note.createdAt,
        durationMillis: note.durationMillis,
        sizeBytes: note.sizeBytes,
        storagePath,
      },
    }
  );

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const responsePayload =
          (await error.context.json()) as ProcessNoteErrorResponse;
        const errorText = responsePayload.error?.trim() || 'The Edge Function returned an error.';
        const stageText = responsePayload.stage?.trim();

        throw new Error(
          stageText
            ? `Transcription request failed at ${stageText}: ${errorText}`
            : `Transcription request failed: ${errorText}`
        );
      } catch (parsingError) {
        if (parsingError instanceof Error) {
          throw parsingError;
        }
      }
    }

    throw new Error(
      `Transcription request failed: ${getErrorMessage(
        error,
        'The Edge Function could not be reached.'
      )}`
    );
  }

  if (!data?.noteId || !data.transcriptText?.trim()) {
    throw new Error('The server finished without returning a transcript.');
  }

  return data;
}

export async function syncVoiceNotesManually(): Promise<VoiceNoteSyncRunResult> {
  const netInfo = await NetInfo.fetch();

  if (!netInfo.isConnected) {
    throw new Error('Connect to the internet before syncing notes.');
  }

  const notes = await listSyncableVoiceNotes();

  if (notes.length === 0) {
    return {
      status: 'noop',
      syncedCount: 0,
      failedCount: 0,
      totalCount: 0,
    };
  }

  const client = getSupabaseClient();
  const {
    data: { session },
    error: sessionError,
  } = await client.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!session) {
    throw new Error('Sign in before syncing notes to the server.');
  }

  let syncedCount = 0;
  let failedCount = 0;

  for (const note of notes) {
    const retryCount = note.retryCount + 1;
    const storagePath = note.storagePath ?? getStoragePath(session.user.id, note);
    let uploadCompleted = Boolean(note.storagePath);

    try {
      if (!uploadCompleted) {
        await updateVoiceNote(note.id, {
          syncStatus: 'uploading',
          processingStatus: 'not_started',
          lastError: null,
        });
        await uploadVoiceNoteAudio(note, storagePath);
        uploadCompleted = true;
        await updateVoiceNote(note.id, {
          syncStatus: 'uploaded',
          storagePath,
          lastError: null,
        });
      }

      await updateVoiceNote(note.id, {
        syncStatus: 'uploaded',
        processingStatus: 'transcribing',
        storagePath,
        lastError: null,
      });

      const result = await processUploadedVoiceNote(note, storagePath);

      await updateVoiceNote(note.id, {
        syncStatus: 'synced',
        processingStatus: 'complete',
        storagePath,
        transcriptText: result.transcriptText.trim(),
        remoteNoteId: result.noteId,
        lastError: null,
        retryCount: 0,
      });
      syncedCount += 1;
    } catch (error) {
      failedCount += 1;

      const failureState = getFailureState(uploadCompleted);

      await updateVoiceNote(note.id, {
        syncStatus: failureState.syncStatus,
        processingStatus: failureState.processingStatus,
        storagePath: uploadCompleted ? storagePath : note.storagePath,
        lastError: getErrorMessage(
          error,
          'The server could not finish syncing this note.'
        ),
        retryCount,
      });
    }
  }

  const status =
    failedCount === 0
      ? 'success'
      : syncedCount === 0
        ? 'failed'
        : 'partial';

  return {
    status,
    syncedCount,
    failedCount,
    totalCount: notes.length,
  };
}
