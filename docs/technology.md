# Technology Overview

## Recommended Stack

For the first version of FieldNotes, the chosen stack is `Expo` for mobile, `Supabase` for backend infrastructure, and `OpenAI` for transcription and structured AI extraction. This gives the team a practical balance between simplicity, speed, and enough flexibility to support custom processing when needed. The main reason to choose this stack is that it covers the core product needs without forcing us to assemble too many separate systems too early.

The product is fundamentally an offline-first mobile workflow with later synchronization, so the architecture should be designed as local-first on the device and cloud-backed once a connection is available. That means the mobile app should treat local storage as the source of truth while the user is in the field, and the backend should handle identity, persistence, processing, and generated outputs after sync.

## Mobile App

The mobile application should be built with `Expo` and `React Native` in `TypeScript`, targeting both iOS and Android from a single codebase. Expo is the right choice here because it gives the team a mature cross-platform development workflow and direct access to device capabilities needed by the product, especially audio recording and local file storage.

For the device layer, the most important capabilities are:

- `expo-audio` for recording and managing voice notes.
- `expo-file-system` for storing audio files locally on the device.
- `expo-sqlite` for structured local persistence of notes, collections, sync state, transcript references, and generated sheet metadata.
- A connectivity layer such as `@react-native-community/netinfo` to detect when the device is back online and ready to sync.

The app should be designed as offline-first. Audio files should be written to local storage progressively, and note metadata should be tracked in a local database. Each note should have a clear sync status such as draft, recorded, pending sync, syncing, synced, or failed. That status model is important because offline reliability is not only about storage, but also about making sync behavior understandable to the user.

For app architecture, a practical first approach is:

- `Expo` + `React Native` + `TypeScript`
- `expo-router` for navigation
- `expo-sqlite` as the local persistence layer
- `TanStack Query` for remote data fetching and cache coordination after sync
- `Zustand` or a similarly lightweight store only if extra client-side workflow state becomes necessary

The key design decision is that offline sync logic should live primarily in the mobile app. The app should maintain a local queue of unsynced audio files and note records, then upload them when connectivity returns. This is a better fit for the product than relying on a backend platform to solve offline behavior by itself, because the critical requirement is dependable field capture before the network is available.

## Backend

For the backend, `Supabase` is the chosen first platform because it combines several required capabilities in one place:

- User authentication
- PostgreSQL database
- File storage
- Server-side functions
- Row-level access control

This matters because FieldNotes needs a backend that stays simple while still handling user accounts, notes, transcripts, generated context sheets, and file assets such as audio recordings and PDFs. Supabase is a good fit for that shape of application.

The recommended backend responsibilities are:

- `Supabase Auth` for email-based authentication, ideally using magic links or one-time-password flows for low-friction sign-in
- `Supabase Postgres` for structured records such as users, collections, notes, transcript records, context sheet data, processing status, and audit metadata
- `Supabase Storage` for raw audio files and generated PDFs
- `Supabase Edge Functions` for secure orchestration of sync processing, AI requests, and output generation

This backend design keeps most business logic in one place without forcing the team to stand up a traditional custom server too early. It is also a good fit for a junior team because the mental model is straightforward: authentication, relational data, file storage, and backend functions all live in one platform.

## Custom Processing on Supabase

Custom backend logic should be implemented in `Supabase Edge Functions`. For FieldNotes, this is where server-side note processing should begin. When the mobile app syncs a voice note, it uploads the audio file to `Supabase Storage` and then invokes a backend function. That function can validate the user, create or update a processing record, retrieve the uploaded file, call external AI services, store the transcript, generate the structured context sheet data, and trigger PDF generation.

The important architectural point is that Supabase is not only for CRUD and auth. It also provides a place for custom backend code. For v1, that custom code can live inside Supabase functions. If processing later becomes too heavy or too specialized, the same pipeline can be moved into a dedicated worker or backend service while still keeping Supabase as the system of record.

## AI Processing

The AI layer should not run directly from the mobile client. It should be called through secure backend functions. The cleanest design is to upload audio and metadata to the backend during sync, then trigger a server-side processing pipeline.

That pipeline should have at least two stages:

1. Transcribe the audio into text.
2. Extract structured context sheet data from the transcript.

`OpenAI` is a strong fit for both stages. The audio API can handle transcription, and the Responses API with Structured Outputs is a strong match for converting transcripts into schema-constrained context sheet data. That matters because the app does not just need a summary or freeform text. It needs a predictable output shape that maps cleanly into a context sheet template.

A practical backend flow would look like this:

1. User syncs one or more notes from the device.
2. Audio files are uploaded to `Supabase Storage`.
3. A `Supabase Edge Function` creates or updates note-processing jobs.
4. The function sends the audio for transcription.
5. The transcript is stored in the database.
6. A second AI step extracts structured fields for the context sheet.
7. The generated sheet data is stored in the database.
8. A PDF is generated and saved to storage.
9. The mobile app fetches the resulting sheet metadata and displays it in the context sheets area.

## Data Model Direction

At a minimum, the backend and local app model should account for the following entities:

- Users
- Collections
- Notes
- Audio assets
- Transcripts
- Context sheets
- Generated PDFs
- Processing jobs or processing status

The note is the center of the workflow. A note belongs to a user and usually to a collection. A note may have one or more associated audio files, one transcript, one extracted structured sheet record, and one generated PDF. Keeping these relationships explicit will make synchronization and recovery much easier.

## PDF Generation

PDF generation should happen on the backend, not on the phone. The mobile app should display either a rendered view of the context sheet or a PDF preview, but the canonical export should be created server-side so output stays consistent across devices.

There are two practical approaches:

- Generate the PDF directly from structured sheet data using a PDF library in a backend function or worker.
- Render a consistent HTML or template-based version of the context sheet and convert that to PDF server-side.

For the first release, the main requirement is consistency and reliability, not a highly dynamic document engine. The PDF should be stored in `Supabase Storage`, while the database keeps the metadata and access relationship.

## Sync Strategy

Offline-to-online synchronization is one of the most important technical areas in the product. The simplest sound approach is:

- Record locally first
- Persist note and file metadata locally
- Track per-note sync state
- Upload when the user explicitly taps sync or when safe automatic sync conditions are met
- Make server processing idempotent so retries do not create duplicates

The backend should support this with durable identifiers, status fields, and retry-safe endpoints. The mobile app should treat sync as an explicit workflow and expose enough state for users to know whether a note is safely local only, uploading, processed, or ready.

## Why This Stack

This stack is recommended because it optimizes for product fit rather than theoretical elegance.

- `Expo` is the right mobile choice because the product depends on device APIs, cross-platform delivery, and fast iteration.
- `Supabase` is the right backend choice because it bundles the main backend primitives in one platform and keeps the architecture understandable for a team that wants simplicity without giving up custom backend code.
- `OpenAI` is the right AI choice because the product needs both transcription and dependable structured extraction, not just generic chat output.

The main weakness in this stack is that offline sync is still something we must design carefully ourselves. No backend provider fully removes that responsibility. That is acceptable, because the most important offline requirement lives on the device anyway and should remain under product control. A second limitation is that some heavy or long-running processing may eventually outgrow what we want to keep inside Supabase functions. If that happens, we can move those workloads out without replacing Supabase as the auth, database, and storage foundation.

## Alternatives Considered

`Firebase` is also a credible option, especially if the team wants a strongly managed backend with mature mobile support. It is particularly strong for authentication, file storage, and client SDKs. However, for this product, Supabase has an advantage if the team prefers PostgreSQL, SQL-level data control, row-level security, and a backend model that feels more transparent and easier to inspect.

`Convex` is interesting if the team wants a highly integrated developer experience for app state and backend logic. It can be a good fit for reactive applications, but for this first version it is less obviously aligned with the combination of raw file handling, explicit sync workflows, PDF generation, and conventional relational reporting needs than Supabase.

## Final Recommendation

For v1, the agreed stack is:

- Mobile: `Expo`, `React Native`, `TypeScript`, `expo-audio`, `expo-file-system`, `expo-sqlite`
- Client architecture: local-first note storage and explicit sync queue
- Backend: `Supabase Auth`, `Postgres`, `Storage`, `Edge Functions`
- AI: `OpenAI` for transcription and structured extraction
- Output: backend-generated PDFs stored in `Supabase Storage`

This gives the product a clear architecture that matches the real workflow: capture locally, sync later, process centrally, and return structured outputs to the app. It also keeps the stack accessible for a less experienced team while leaving a path open to move more complex processing into custom infrastructure later if the product needs it.

## Open Technical Questions

- Should transcription happen entirely after upload, or should the app eventually support partial on-device transcription?
- Should sync be only manual in v1, or should the app also support automatic background sync when the device reconnects?
- What exact schema should be used for structured context sheet extraction?
- What PDF generation method is most reliable within the chosen backend runtime?
- Does the organization need editable context sheets after AI generation, or is read-only output acceptable for the first release?
