import { Directory, File as ExpoFile, Paths } from 'expo-file-system';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import type { VoiceNote } from '../types';

type VoiceNoteRow = {
  id: string;
  file_uri: string;
  created_at: string;
  duration_ms: number;
  size_bytes: number | null;
};

const DATABASE_NAME = 'fieldnotes.db';
const AUDIO_DIRECTORY_NAME = 'voice-notes';

let databasePromise: Promise<SQLiteDatabase> | null = null;

function ensureAudioDirectory() {
  const audioDirectory = new Directory(Paths.document, AUDIO_DIRECTORY_NAME);

  if (!audioDirectory.exists) {
    audioDirectory.create({ idempotent: true, intermediates: true });
  }

  return audioDirectory;
}

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = openDatabaseAsync(DATABASE_NAME);
  }

  const database = await databasePromise;

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS voice_notes (
      id TEXT PRIMARY KEY NOT NULL,
      file_uri TEXT NOT NULL,
      created_at TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      size_bytes INTEGER
    );
  `);

  return database;
}

function mapVoiceNote(row: VoiceNoteRow): VoiceNote {
  return {
    id: row.id,
    fileUri: row.file_uri,
    createdAt: row.created_at,
    durationMillis: row.duration_ms,
    sizeBytes: row.size_bytes,
  };
}

function createVoiceNoteId() {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizeFileExtension(extension: string) {
  const normalized = extension.replace('.', '').trim().toLowerCase();

  if (!normalized || normalized.length > 8) {
    return null;
  }

  return normalized;
}

function getFileExtension(uri: string, fallbackExtension?: string) {
  const cleanUri = uri.split('?')[0] ?? uri;
  const extension = cleanUri.split('.').pop() ?? '';
  const sanitizedExtension = sanitizeFileExtension(extension);

  if (sanitizedExtension) {
    return sanitizedExtension;
  }

  return sanitizeFileExtension(fallbackExtension ?? '') ?? 'm4a';
}

async function waitForFileToBeReady(uri: string) {
  const sourceFile = new ExpoFile(uri);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const fileInfo = sourceFile.info();

    if (sourceFile.exists && (fileInfo.size ?? 0) > 0) {
      return sourceFile;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 150);
    });
  }

  return sourceFile;
}

export async function initializeVoiceNotesStore() {
  ensureAudioDirectory();
  await getDatabase();
}

export async function listVoiceNotes() {
  const database = await getDatabase();
  const rows = await database.getAllAsync<VoiceNoteRow>(
    `SELECT id, file_uri, created_at, duration_ms, size_bytes
     FROM voice_notes
     ORDER BY created_at DESC`
  );

  return rows.map(mapVoiceNote);
}

export async function persistVoiceNote({
  sourceUri,
  durationMillis,
  preferredExtension,
}: {
  sourceUri: string;
  durationMillis: number;
  preferredExtension?: string;
}) {
  const database = await getDatabase();
  const audioDirectory = ensureAudioDirectory();
  const noteId = createVoiceNoteId();
  const createdAt = new Date().toISOString();
  const sourceFile = await waitForFileToBeReady(sourceUri);
  const destinationFile = new ExpoFile(
    audioDirectory,
    `${noteId}.${getFileExtension(sourceUri, preferredExtension)}`
  );

  sourceFile.copy(destinationFile);

  const fileInfo = destinationFile.info();
  const voiceNote: VoiceNote = {
    id: noteId,
    fileUri: destinationFile.uri,
    createdAt,
    durationMillis: Math.max(0, Math.round(durationMillis)),
    sizeBytes: fileInfo.size ?? null,
  };

  await database.runAsync(
    `INSERT INTO voice_notes (id, file_uri, created_at, duration_ms, size_bytes)
     VALUES (?, ?, ?, ?, ?)`,
    [
      voiceNote.id,
      voiceNote.fileUri,
      voiceNote.createdAt,
      voiceNote.durationMillis,
      voiceNote.sizeBytes,
    ]
  );

  return voiceNote;
}

export async function deleteVoiceNote(note: VoiceNote) {
  const database = await getDatabase();
  const file = new ExpoFile(note.fileUri);

  if (file.exists) {
    file.delete();
  }

  await database.runAsync('DELETE FROM voice_notes WHERE id = ?', [note.id]);
}
