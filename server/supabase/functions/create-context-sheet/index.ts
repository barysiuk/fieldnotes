import { createClient } from 'npm:@supabase/supabase-js@2';

type CreateContextSheetRequest = {
  noteIds?: string[];
  templateId?: string;
  title?: string;
};

type TemplateRow = {
  id: string;
  user_id: string | null;
  name: string;
  schema_json: Record<string, unknown>;
  prompt_text: string;
};

type NoteTranscriptRow =
  | {
      transcript_text?: string | null;
    }
  | Array<{
      transcript_text?: string | null;
    }>;

type NoteRow = {
  id: string;
  recorded_at: string;
  note_transcripts?: NoteTranscriptRow | null;
};

type OpenAiChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
      refusal?: string | null;
    };
  }>;
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
const contextSheetModel =
  Deno.env.get('OPENAI_CONTEXT_SHEET_MODEL')?.trim() || 'gpt-4.1-mini';

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

function getTranscriptText(note: NoteRow) {
  const transcriptValue = note.note_transcripts;

  if (!transcriptValue) {
    return '';
  }

  if (Array.isArray(transcriptValue)) {
    return transcriptValue[0]?.transcript_text?.trim() ?? '';
  }

  return transcriptValue.transcript_text?.trim() ?? '';
}

function normalizeNoteIds(noteIds: string[] | undefined) {
  return Array.from(new Set((noteIds ?? []).map((noteId) => noteId.trim()).filter(Boolean)));
}

async function loadTemplate(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  templateId?: string
) {
  if (templateId?.trim()) {
    const { data, error } = await adminClient
      .from('context_sheet_templates')
      .select('id, user_id, name, schema_json, prompt_text')
      .eq('id', templateId.trim())
      .maybeSingle();

    if (error) {
      throw error;
    }

    const template = (data as TemplateRow | null) ?? null;

    if (!template) {
      throw new Error('The requested context sheet template was not found.');
    }

    if (template.user_id && template.user_id !== userId) {
      throw new Error('You do not have access to the requested context sheet template.');
    }

    return template;
  }

  const { data, error } = await adminClient
    .from('context_sheet_templates')
    .select('id, user_id, name, schema_json, prompt_text')
    .is('user_id', null)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const template = (data as TemplateRow | null) ?? null;

  if (!template) {
    throw new Error('No default context sheet template is configured.');
  }

  return template;
}

async function loadNotes(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  noteIds: string[]
) {
  const { data, error } = await adminClient
    .from('notes')
    .select(
      `
        id,
        recorded_at,
        note_transcripts!inner(transcript_text)
      `
    )
    .eq('user_id', userId)
    .in('id', noteIds);

  if (error) {
    throw error;
  }

  const notes = ((data ?? []) as NoteRow[])
    .map((note) => ({
      ...note,
      transcriptText: getTranscriptText(note),
    }))
    .filter((note) => note.transcriptText.length > 0)
    .sort((left, right) => left.recorded_at.localeCompare(right.recorded_at));

  if (notes.length !== noteIds.length) {
    throw new Error(
      'Every selected note must exist, belong to the signed-in user, and already have a completed transcript.'
    );
  }

  return notes;
}

async function generateContextSheetData(
  template: TemplateRow,
  notes: Array<NoteRow & { transcriptText: string }>
) {
  const transcriptSource = notes
    .map(
      (note, index) =>
        `Note ${index + 1}\nRecorded at: ${note.recorded_at}\nTranscript:\n${note.transcriptText}`
    )
    .join('\n\n---\n\n');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: contextSheetModel,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content: template.prompt_text,
        },
        {
          role: 'user',
          content:
            'Create one context sheet from the following ordered field-note transcripts.\n\n' +
            transcriptSource,
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'context_sheet',
          strict: true,
          schema: template.schema_json,
        },
      },
    }),
  });

  const payload = (await response.json()) as OpenAiChatCompletionResponse;

  if (!response.ok) {
    throw new Error(
      payload.error?.message || 'OpenAI context sheet extraction failed.'
    );
  }

  const message = payload.choices?.[0]?.message;
  const responseText = message?.content?.trim();

  if (message?.refusal?.trim()) {
    throw new Error(`OpenAI refused the context sheet request: ${message.refusal.trim()}`);
  }

  if (!responseText) {
    throw new Error('OpenAI returned an empty context sheet payload.');
  }

  const parsed = JSON.parse(responseText);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('OpenAI returned malformed context sheet JSON.');
  }

  return parsed as Record<string, unknown>;
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function buildContextSheetTitle(
  data: Record<string, unknown>,
  notes: Array<NoteRow & { transcriptText: string }>
) {
  const contextNumber =
    typeof data.contextNumber === 'string' ? data.contextNumber.trim() : '';

  if (contextNumber) {
    return `Context ${contextNumber}`;
  }

  const firstDate = notes[0]?.recorded_at;
  const lastDate = notes[notes.length - 1]?.recorded_at;

  if (!firstDate || !lastDate) {
    return 'Context sheet';
  }

  const firstLabel = formatDateLabel(firstDate);
  const lastLabel = formatDateLabel(lastDate);

  return firstLabel === lastLabel
    ? `Context sheet - ${firstLabel}`
    : `Context sheet - ${firstLabel} to ${lastLabel}`;
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

  let stage = 'request';

  try {
    stage = 'auth';
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return createJsonResponse(401, {
        error: 'You must be signed in before creating a context sheet.',
      });
    }

    stage = 'payload';
    const body = (await request.json()) as CreateContextSheetRequest;
    const noteIds = normalizeNoteIds(body.noteIds);
    const templateId = body.templateId?.trim() || undefined;
    const explicitTitle = body.title?.trim() || '';

    if (noteIds.length === 0) {
      return createJsonResponse(400, {
        error: 'Pick at least one processed note.',
      });
    }

    stage = 'template';
    const template = await loadTemplate(adminClient, user.id, templateId);

    stage = 'load_notes';
    const notes = await loadNotes(adminClient, user.id, noteIds);

    stage = 'generate';
    const data = await generateContextSheetData(template, notes);

    stage = 'insert_sheet';
    const title = explicitTitle || buildContextSheetTitle(data, notes);
    const { data: contextSheet, error: insertError } = await adminClient
      .from('context_sheets')
      .insert({
        user_id: user.id,
        template_id: template.id,
        title,
        data,
      })
      .select('id, title, template_id, data, created_at, updated_at')
      .single();

    if (insertError || !contextSheet) {
      throw insertError ?? new Error('Could not create the context sheet record.');
    }

    stage = 'insert_links';
    const { error: linksError } = await adminClient.from('context_sheet_notes').insert(
      notes.map((note, index) => ({
        context_sheet_id: contextSheet.id,
        note_id: note.id,
        sequence_index: index,
      }))
    );

    if (linksError) {
      throw linksError;
    }

    return createJsonResponse(200, {
      contextSheet: {
        id: contextSheet.id,
        title: contextSheet.title,
        templateId: contextSheet.template_id,
        data: contextSheet.data,
        createdAt: contextSheet.created_at,
        updatedAt: contextSheet.updated_at,
        noteCount: notes.length,
      },
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        error: getErrorMessage(error, 'Unknown error'),
        stage,
      })
    );

    return createJsonResponse(500, {
      error: getErrorMessage(error, 'Could not create the context sheet.'),
      stage,
    });
  }
});
