# Supabase Voice Sync Setup

This repository now includes the first server-side pieces for manual voice-note sync and transcription:

- SQL schema: `server/supabase/migrations/20260506_voice_notes.sql`
- Edge Function: `server/supabase/functions/process-note/index.ts`

## What This Enables

- the mobile app uploads pending audio notes into the `voice-notes` storage bucket
- the mobile app calls the `process-note` edge function
- the edge function creates or updates the server note row
- the edge function downloads the uploaded audio and sends it to OpenAI transcription
- the transcript is saved in `public.note_transcripts`

## Required Supabase Function Secrets

Set these in the Supabase project before deploying the function:

- `OPENAI_API_KEY`
- `OPENAI_TRANSCRIPTION_MODEL`
  Recommended initial value: `gpt-4o-mini-transcribe`
- `OPENAI_TRANSCRIPTION_PROMPT`
  Optional. Use this later for archaeology-specific glossary guidance.
- `FIELDNOTES_NOTES_BUCKET`
  Optional. Default is `voice-notes`.

The standard Supabase function environment also needs to be available:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Mobile Environment

The mobile app now supports these environment variables in `mobile/.env.example`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_FIELDNOTES_NOTES_BUCKET`
- `EXPO_PUBLIC_SUPABASE_PROCESS_NOTE_FUNCTION`

Defaults:

- bucket: `voice-notes`
- function: `process-note`

## Deployment Order

1. Apply the SQL migration in Supabase.
2. Deploy the `process-note` edge function.
3. Set the function secrets.
4. Fill in `mobile/.env`.
5. Sign in inside the app.
6. Record a note and tap `Sync now`.

## Current Scope

This is intentionally narrow:

- sync is manual only
- audio is uploaded first, then transcribed on the server
- the app stores transcript text back into local SQLite after sync
- no background sync and no context-sheet extraction yet
