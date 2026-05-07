import { createClient } from 'npm:@supabase/supabase-js@2';

type ProcessNoteRequest = {
  clientNoteId?: string;
  createdAt?: string;
  durationMillis?: number;
  sizeBytes?: number | null;
  storagePath?: string;
};

type OpenAiTranscriptionResponse = {
  text?: string;
  error?: {
    message?: string;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')?.trim() ?? '';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')?.trim() ?? '';
const supabaseServiceRoleKey =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim() ?? '';
const openAiApiKey = Deno.env.get('OPENAI_API_KEY')?.trim() ?? '';
const transcriptionModel =
  Deno.env.get('OPENAI_TRANSCRIPTION_MODEL')?.trim() ||
  'gpt-4o-mini-transcribe';
const transcriptionPrompt =
  Deno.env.get('OPENAI_TRANSCRIPTION_PROMPT')?.trim() ?? '';
const notesBucket =
  Deno.env.get('FIELDNOTES_NOTES_BUCKET')?.trim() || 'voice-notes';

function createJsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message.trim().length > 0
  ) {
    return error.message;
  }

  return fallback;
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
  }

  if (typeof error === 'object' && error !== null) {
    return error;
  }

  return {
    value: String(error),
  };
}

async function transcribeAudio(audioBlob: Blob, fileName: string) {
  const formData = new FormData();

  formData.append(
    'file',
    new File([audioBlob], fileName, {
      type: audioBlob.type || 'audio/mp4',
    })
  );
  formData.append('model', transcriptionModel);

  if (transcriptionPrompt) {
    formData.append('prompt', transcriptionPrompt);
  }

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
    },
    body: formData,
  });
  const payload = (await response.json()) as OpenAiTranscriptionResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message || 'OpenAI transcription request failed.'
    );
  }

  const transcriptText = payload.text?.trim();

  if (!transcriptText) {
    throw new Error('OpenAI returned an empty transcript.');
  }

  return transcriptText;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return createJsonResponse(405, {
      error: 'Method not allowed.',
    });
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey || !openAiApiKey) {
    return createJsonResponse(500, {
      error:
        'Missing required function configuration. Check Supabase and OpenAI environment variables.',
    });
  }

  const authHeader = request.headers.get('Authorization') ?? '';
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey);

  let noteId: string | null = null;
  let stage = 'request';

  try {
    stage = 'auth';
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return createJsonResponse(401, {
        error: 'You must be signed in before processing a note.',
      });
    }

    stage = 'payload';
    const body = (await request.json()) as ProcessNoteRequest;
    const clientNoteId = body.clientNoteId?.trim() ?? '';
    const createdAt = body.createdAt?.trim() ?? '';
    const storagePath = body.storagePath?.trim() ?? '';
    const durationMillis = Math.max(0, Math.round(body.durationMillis ?? 0));
    const sizeBytes =
      typeof body.sizeBytes === 'number' ? Math.max(0, Math.round(body.sizeBytes)) : null;

    if (!clientNoteId || !createdAt || !storagePath || durationMillis <= 0) {
      return createJsonResponse(400, {
        error: 'Missing required note payload.',
      });
    }

    stage = 'upsert_note';
    const { data: note, error: noteError } = await adminClient
      .from('notes')
      .upsert(
        {
          user_id: user.id,
          client_note_id: clientNoteId,
          recorded_at: createdAt,
          status: 'transcribing',
          audio_storage_path: storagePath,
          duration_ms: durationMillis,
          size_bytes: sizeBytes,
          last_error: null,
        },
        {
          onConflict: 'user_id,client_note_id',
        }
      )
      .select('id')
      .single();

    if (noteError || !note) {
      throw noteError ?? new Error('Could not create the server note record.');
    }

    noteId = note.id as string;
    console.log(
      JSON.stringify({
        clientNoteId,
        noteId,
        stage,
        storagePath,
        userId: user.id,
      })
    );

    stage = 'download_audio';
    const { data: audioFile, error: downloadError } = await adminClient.storage
      .from(notesBucket)
      .download(storagePath);

    if (downloadError || !audioFile) {
      throw downloadError ?? new Error('Could not read the uploaded audio file.');
    }

    stage = 'openai_transcription';
    const transcriptText = await transcribeAudio(audioFile, `${clientNoteId}.m4a`);
    console.log(
      JSON.stringify({
        noteId,
        stage,
        transcriptLength: transcriptText.length,
      })
    );

    stage = 'upsert_transcript';
    const { error: transcriptError } = await adminClient
      .from('note_transcripts')
      .upsert(
        {
          note_id: noteId,
          provider: 'openai',
          model: transcriptionModel,
          status: 'complete',
          transcript_text: transcriptText,
        },
        {
          onConflict: 'note_id',
        }
      );

    if (transcriptError) {
      throw transcriptError;
    }

    stage = 'complete_note';
    const { error: noteUpdateError } = await adminClient
      .from('notes')
      .update({
        status: 'complete',
        last_error: null,
      })
      .eq('id', noteId);

    if (noteUpdateError) {
      throw noteUpdateError;
    }

    return createJsonResponse(200, {
      noteId,
      transcriptText,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        error: getErrorMessage(error, 'Could not process this note.'),
        errorDetail: serializeError(error),
        noteId,
        stage,
      })
    );

    if (noteId) {
      await adminClient
        .from('notes')
        .update({
          status: 'failed',
          last_error: getErrorMessage(error, 'Processing failed.'),
        })
        .eq('id', noteId);
    }

    return createJsonResponse(500, {
      error: getErrorMessage(error, 'Could not process this note.'),
      stage,
    });
  }
});
