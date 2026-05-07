import { FunctionsHttpError } from '@supabase/supabase-js';

import type { ContextSheet, ContextSheetData } from '../types';
import { getSupabaseClient } from './supabase';

type ContextSheetRow = {
  id: string;
  title: string;
  template_id: string;
  data: ContextSheetData;
  created_at: string;
  updated_at: string;
  context_sheet_templates?:
    | {
        render_html?: string | null;
      }
    | Array<{
        render_html?: string | null;
      }>
    | null;
  context_sheet_notes?: Array<{
    note_id: string;
  }> | null;
};

type ContextSheetResponse = {
  contextSheet?: {
    id: string;
  };
  error?: string;
};

type ContextSheetErrorResponse = {
  error?: string;
  stage?: string;
};

const CREATE_CONTEXT_SHEET_FUNCTION_NAME =
  process.env.EXPO_PUBLIC_SUPABASE_CREATE_CONTEXT_SHEET_FUNCTION?.trim() ||
  'create-context-sheet';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function mapContextSheet(row: ContextSheetRow): ContextSheet {
  const templateValue = row.context_sheet_templates;
  const templateHtml = Array.isArray(templateValue)
    ? templateValue[0]?.render_html ?? null
    : templateValue?.render_html ?? null;

  return {
    id: row.id,
    title: row.title,
    templateId: row.template_id,
    templateHtml,
    data: row.data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    noteCount: Array.isArray(row.context_sheet_notes) ? row.context_sheet_notes.length : 0,
  };
}

export async function listContextSheets() {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('context_sheets')
    .select(
      `
        id,
        title,
        template_id,
        data,
        created_at,
        updated_at,
        context_sheet_templates(render_html),
        context_sheet_notes(note_id)
      `
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(
      `Could not load context sheets: ${getErrorMessage(
        error,
        'The database query failed.'
      )}`
    );
  }

  return (data ?? []).map((row) => mapContextSheet(row as ContextSheetRow));
}

export async function createContextSheet(noteIds: string[]) {
  const cleanedNoteIds = Array.from(
    new Set(noteIds.map((noteId) => noteId.trim()).filter(Boolean))
  );

  if (cleanedNoteIds.length === 0) {
    throw new Error('Pick at least one processed note before creating a context sheet.');
  }

  const client = getSupabaseClient();
  const { data, error } = await client.functions.invoke<ContextSheetResponse>(
    CREATE_CONTEXT_SHEET_FUNCTION_NAME,
    {
      body: {
        noteIds: cleanedNoteIds,
      },
    }
  );

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const responsePayload =
          (await error.context.json()) as ContextSheetErrorResponse;
        const errorText = responsePayload.error?.trim() || 'The Edge Function returned an error.';
        const stageText = responsePayload.stage?.trim();

        throw new Error(
          stageText
            ? `Context sheet creation failed at ${stageText}: ${errorText}`
            : `Context sheet creation failed: ${errorText}`
        );
      } catch (parsingError) {
        if (parsingError instanceof Error) {
          throw parsingError;
        }
      }
    }

    throw new Error(
      `Context sheet creation failed: ${getErrorMessage(
        error,
        'The Edge Function could not be reached.'
      )}`
    );
  }

  if (!data?.contextSheet) {
    throw new Error('The server finished without returning a context sheet.');
  }

  return data.contextSheet;
}
