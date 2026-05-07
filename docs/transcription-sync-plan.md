# Transcription And Sync Plan

## Recommendation

For `v2`, FieldNotes should keep recording fully offline on the device, then upload the raw audio to `Supabase Storage` and perform the canonical transcription on the server.

This is the right first implementation for the current product because:

- the app is already local-first for capture, so reliability in the field is preserved
- server-side transcription gives more room to improve quality over time without shipping new mobile binaries
- archaeology-specific vocabulary, site codes, trench labels, and organization-specific phrasing are easier to handle centrally
- the same backend pipeline can later run both transcription and structured context-sheet extraction
- retries, auditing, and re-processing are easier if the raw audio is stored on the server

The team can still leave room for a later hybrid mode where the phone produces a rough local transcript for immediate preview, but the server transcript remains the source of truth.

## Decision

The main product decision should be:

- `v2`: offline audio capture on device, manual sync, server-side transcription
- `later`: optional on-device preview transcript if users need immediate text before connectivity returns

The main technical decision should be:

- store and sync the raw audio file, not only extracted text

If only text is synced, the team loses the ability to:

- re-run transcription with a better model
- apply a new archaeology glossary later
- audit a questionable transcript against the original recording
- improve structured extraction after the first pass

## End-To-End Flow

1. User records a note offline.
2. The app saves the audio file locally and writes a local note record in SQLite.
3. The local record is marked `pending_upload`.
4. When the user is signed in and online, the app uploads the audio file to `Supabase Storage`.
5. The app upserts a server note row using a stable client-generated note id.
6. The app calls a `Supabase Edge Function` to enqueue or start transcription.
7. The backend transcribes the audio with the configured cloud model.
8. The backend stores the transcript and processing metadata in Postgres.
9. The backend runs structured extraction for context-sheet fields.
10. The backend stores the extracted fields and final processing status.
11. The mobile app fetches the updated note record, transcript, and extracted output.

## Why Not On-Device First For V2

On-device transcription is attractive because it can work offline, but it is the weaker `v2` choice here.

Main drawbacks:

- model quality on device will usually be worse than server-side options for domain language
- custom vocabulary support is harder and more fragmented across platforms
- large models increase app size and device resource use
- long recordings will cost battery and time on weaker phones
- the app still needs server sync later for search, context sheets, and cross-device access

That means on-device transcription adds significant complexity without removing the need for a backend processing pipeline.

## Domain Vocabulary Strategy

Archaeology language is the strongest argument for keeping the canonical transcription on the server.

The transcription pipeline should support a per-organization or per-project glossary with entries such as:

- trench and context naming conventions
- site codes
- local place names
- artifact types
- material names
- common abbreviations
- specialist terminology

Use this glossary in two ways:

1. Store glossary terms in the database and attach the relevant list to the transcription job.
2. Feed the glossary into the post-transcription cleanup and structured extraction steps.

The exact mechanism depends on the transcription provider, but the product design should assume that vocabulary is configuration, not hardcoded app logic.

## Local Mobile Changes

The current local table only stores the file path and basic note metadata. That is not enough for sync and processing.

Add fields like:

- `sync_status`: `local_only | pending_upload | uploading | uploaded | synced | failed`
- `processing_status`: `not_started | queued | transcribing | extracting | complete | failed`
- `remote_note_id`: nullable server row id
- `storage_path`: nullable uploaded file path
- `transcript_text`: nullable cached transcript for offline viewing after sync
- `last_error`: nullable text
- `retry_count`: integer
- `updated_at`: timestamp

Suggested local behavior:

- new recordings start as `pending_upload`
- upload retries are idempotent and keyed by the client note id
- failed notes remain visible and retryable
- delete should be blocked or clearly confirmed if a note is mid-sync

## Server Data Model

The backend should treat the client note id as an idempotency key.

Suggested first-pass tables:

### `profiles`

Already recommended in the existing auth setup docs.

### `notes`

- `id uuid primary key`
- `user_id uuid not null references profiles(id)`
- `client_note_id text not null`
- `created_at timestamptz not null`
- `recorded_at timestamptz not null`
- `status text not null`
- `audio_storage_path text not null`
- `duration_ms integer not null`
- `size_bytes bigint`
- `device_platform text`
- `language_code text`
- unique `(user_id, client_note_id)`

### `note_transcripts`

- `id uuid primary key`
- `note_id uuid not null references notes(id) on delete cascade`
- `provider text not null`
- `model text not null`
- `status text not null`
- `transcript_text text`
- `raw_response jsonb`
- `confidence jsonb`
- `glossary_version text`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

### `note_extractions`

- `id uuid primary key`
- `note_id uuid not null references notes(id) on delete cascade`
- `schema_version text not null`
- `status text not null`
- `data jsonb`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

### `processing_jobs`

- `id uuid primary key`
- `note_id uuid not null references notes(id) on delete cascade`
- `job_type text not null`
- `status text not null`
- `attempt_count integer not null default 0`
- `last_error text`
- `started_at timestamptz`
- `finished_at timestamptz`

## Storage Layout

Use a private Supabase storage bucket for raw audio.

Suggested path pattern:

`voice-notes/{user_id}/{client_note_id}/original.m4a`

Benefits:

- deterministic paths make retries simpler
- one user cannot accidentally collide with another user
- raw files stay available for re-processing

## API Shape

The mobile app does not need a large custom API surface yet. A small set is enough:

### `POST /sync-note`

Edge Function responsibility:

- authenticate the user
- upsert the `notes` row using `(user_id, client_note_id)`
- validate the storage path and metadata
- create or resume a transcription job
- return the server note id and current statuses

### `POST /process-note`

Edge Function responsibility:

- download or stream the audio from storage
- call the transcription provider
- persist transcript output
- call structured extraction
- persist extracted context-sheet data
- update job and note statuses

This can be one function or two separate functions. For `v2`, one orchestration function is acceptable if execution time stays within platform limits.

## Sync Behavior In The App

Recommended `v2` sync behavior:

- manual sync button remains the primary trigger
- no automatic background sync
- when the user taps sync, process every note that is still pending upload or not yet transcribed
- if there are no pending notes, do nothing and return a clean no-op result

The app already includes `@react-native-community/netinfo`, but in this version it only needs to guard the manual sync action with a clear offline message.

Important rules:

- never assume upload succeeded until both storage upload and note upsert succeed
- sync must be resumable after app restart
- retries must not create duplicate server notes
- local note deletion should reconcile with server state explicitly
- the sync action should be idempotent, so pressing it twice does not create duplicate uploads or duplicate transcription jobs

## Processing Status UX

The user should see that the note moves through distinct stages:

- `Saved on device`
- `Waiting to upload`
- `Uploading`
- `Uploaded`
- `Transcribing`
- `Extracting record`
- `Ready`
- `Failed`

This matters because the app is offline-first. Users need confidence that their note is safe even if the transcript is not ready yet.

## Quality Strategy

To protect transcript quality, the system should keep the original audio and record:

- transcription provider
- model name
- glossary version used
- job errors
- transcript revision timestamp

That gives the team a clear path to improve quality later:

- reprocess low-quality notes with a better model
- re-run old notes when glossary terms are expanded
- compare provider performance on archaeology-specific speech

## Recommended V2 Scope

Implement the feature in this order:

1. Extend the local SQLite schema with sync and processing fields.
2. Add a manual sync service in the mobile app that uploads and processes pending notes when the user taps the sync button.
3. Create Supabase tables for notes, transcripts, extractions, and jobs.
4. Add a private storage bucket for raw audio.
5. Build an Edge Function that upserts a note and starts processing.
6. Store transcript text back in the database and return it to the app.
7. Add extraction after transcription is stable.

This sequencing keeps the first milestone narrow: reliable manual upload plus transcript retrieval.

## Practical Recommendation

Do not try to solve on-device transcription and backend transcription at the same time.

The simplest defensible product path is:

- device handles capture, local persistence, retry state, and manual upload
- server handles canonical transcription, glossary-aware processing, and structured extraction

That gives FieldNotes the best chance of delivering accurate archaeology-friendly transcripts without compromising offline capture reliability.
