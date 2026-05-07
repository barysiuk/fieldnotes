create table if not exists public.context_sheet_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  schema_json jsonb not null,
  prompt_text text not null,
  render_html text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.context_sheets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id uuid not null references public.context_sheet_templates (id),
  title text not null,
  data jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.context_sheet_notes (
  context_sheet_id uuid not null references public.context_sheets (id) on delete cascade,
  note_id uuid not null references public.notes (id) on delete cascade,
  sequence_index integer not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (context_sheet_id, note_id)
);

create index if not exists context_sheets_user_id_idx
on public.context_sheets (user_id, created_at desc);

create index if not exists context_sheet_notes_note_id_idx
on public.context_sheet_notes (note_id);

grant select on table public.context_sheet_templates
to authenticated, service_role;

grant select on table public.context_sheets
to authenticated, service_role;

grant select on table public.context_sheet_notes
to authenticated, service_role;

grant insert, update, delete on table public.context_sheet_templates
to service_role;

grant insert, update, delete on table public.context_sheets
to service_role;

grant insert, update, delete on table public.context_sheet_notes
to service_role;

alter table public.context_sheet_templates enable row level security;
alter table public.context_sheets enable row level security;
alter table public.context_sheet_notes enable row level security;

drop policy if exists "Users can read available context sheet templates" on public.context_sheet_templates;
create policy "Users can read available context sheet templates"
on public.context_sheet_templates
for select
to authenticated
using (user_id is null or user_id = auth.uid());

drop policy if exists "Users can read their own context sheets" on public.context_sheets;
create policy "Users can read their own context sheets"
on public.context_sheets
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can read their own context sheet note links" on public.context_sheet_notes;
create policy "Users can read their own context sheet note links"
on public.context_sheet_notes
for select
to authenticated
using (
  exists (
    select 1
    from public.context_sheets
    where public.context_sheets.id = public.context_sheet_notes.context_sheet_id
      and public.context_sheets.user_id = auth.uid()
  )
);

drop trigger if exists set_context_sheet_templates_updated_at on public.context_sheet_templates;
create trigger set_context_sheet_templates_updated_at
before update on public.context_sheet_templates
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_context_sheets_updated_at on public.context_sheets;
create trigger set_context_sheets_updated_at
before update on public.context_sheets
for each row
execute function public.set_current_timestamp_updated_at();

insert into public.context_sheet_templates (
  user_id,
  name,
  schema_json,
  prompt_text,
  render_html
)
select
  null,
  'Default context sheet',
  $${
    "type": "object",
    "additionalProperties": false,
    "required": [
      "site",
      "additionalSheets",
      "contextNumber",
      "contextType",
      "trench",
      "planNumber",
      "sectionNumber",
      "coordinates",
      "level",
      "relationships",
      "description",
      "interpretationDiscussion",
      "temporalSequence",
      "finds",
      "smallFinds",
      "samples",
      "buildingMaterials",
      "recorder",
      "date",
      "initials"
    ],
    "properties": {
      "site": {
        "type": "object",
        "additionalProperties": false,
        "required": ["name", "code"],
        "properties": {
          "name": { "type": "string" },
          "code": { "type": "string" }
        }
      },
      "additionalSheets": { "type": "string" },
      "contextNumber": { "type": "string" },
      "contextType": {
        "type": "string",
        "enum": ["", "deposit", "cut", "masonry", "structure"]
      },
      "trench": { "type": "string" },
      "planNumber": { "type": "string" },
      "sectionNumber": { "type": "string" },
      "coordinates": { "type": "string" },
      "level": { "type": "string" },
      "relationships": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "overlainBy",
          "abuttedBy",
          "cutBy",
          "filledBy",
          "sameAs",
          "partOf",
          "consistsOf",
          "overlies",
          "butts",
          "cuts",
          "fillOf",
          "uncertain"
        ],
        "properties": {
          "overlainBy": {
            "type": "array",
            "items": { "type": "string" }
          },
          "abuttedBy": {
            "type": "array",
            "items": { "type": "string" }
          },
          "cutBy": {
            "type": "array",
            "items": { "type": "string" }
          },
          "filledBy": {
            "type": "array",
            "items": { "type": "string" }
          },
          "sameAs": {
            "type": "array",
            "items": { "type": "string" }
          },
          "partOf": {
            "type": "array",
            "items": { "type": "string" }
          },
          "consistsOf": {
            "type": "array",
            "items": { "type": "string" }
          },
          "overlies": {
            "type": "array",
            "items": { "type": "string" }
          },
          "butts": {
            "type": "array",
            "items": { "type": "string" }
          },
          "cuts": {
            "type": "array",
            "items": { "type": "string" }
          },
          "fillOf": {
            "type": "array",
            "items": { "type": "string" }
          },
          "uncertain": { "type": "string" }
        }
      },
      "description": { "type": "string" },
      "interpretationDiscussion": { "type": "string" },
      "temporalSequence": {
        "type": "object",
        "additionalProperties": false,
        "required": ["above", "current", "below"],
        "properties": {
          "above": {
            "type": "array",
            "items": { "type": "string" }
          },
          "current": { "type": "string" },
          "below": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      },
      "finds": {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "none",
          "pot",
          "bone",
          "flint",
          "stone",
          "burntStone",
          "glass",
          "metal",
          "cbm",
          "wood",
          "leather",
          "other"
        ],
        "properties": {
          "none": { "type": "boolean" },
          "pot": { "type": "boolean" },
          "bone": { "type": "boolean" },
          "flint": { "type": "boolean" },
          "stone": { "type": "boolean" },
          "burntStone": { "type": "boolean" },
          "glass": { "type": "boolean" },
          "metal": { "type": "boolean" },
          "cbm": { "type": "boolean" },
          "wood": { "type": "boolean" },
          "leather": { "type": "boolean" },
          "other": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      },
      "smallFinds": { "type": "string" },
      "samples": { "type": "string" },
      "buildingMaterials": { "type": "string" },
      "recorder": { "type": "string" },
      "date": { "type": "string" },
      "initials": { "type": "string" }
    }
  }$$::jsonb,
  $$You are generating a formal archaeological context sheet from multiple field-note transcripts.

Use the transcripts as one combined source record. They are already ordered from oldest to newest. Use that order to resolve chronology and to infer temporal sequence only when the notes clearly support it.

Follow these rules:
- Output valid JSON only and match the provided schema exactly.
- Use only information that is directly stated or strongly supported by the transcripts.
- If a field is missing, unclear, or unsupported, return an empty string, an empty array, or false as appropriate.
- Do not invent context numbers, trench numbers, plan numbers, section numbers, finds, dates, or relationships.
- Keep the description factual and observation-led.
- Keep interpretationDiscussion concise, evidence-based, and non-speculative.
- Use contextType values from this exact set: deposit, cut, masonry, structure, or an empty string when unsupported.
- Put uncertain or conflicting relational information in relationships.uncertain instead of guessing.
- Only mark finds booleans true when the material category is clearly supported by the transcripts.
- Use temporalSequence.above and temporalSequence.below for related contexts that are clearly above or below the current context. Put the current context number in temporalSequence.current only if it is explicitly known.

Field guidance based on the context recording sheet:
- site.name and site.code: capture the site name and code if stated.
- additionalSheets: note only if extra sheets are explicitly mentioned.
- contextNumber: use the explicit context identifier only.
- trench, planNumber, sectionNumber, coordinates, level: copy only explicit values.
- relationships: record stratigraphic relationships such as overlain by, abutted by, cut by, filled by, same as, part of, consists of, overlies, butts, cuts, and fill of.
- description: describe deposit type, cut shape, composition, colour, inclusions, dimensions, depth, condition, and any observed construction detail when present.
- interpretationDiscussion: summarize the evidence-based interpretation without elaborating beyond the notes.
- smallFinds, samples, buildingMaterials, recorder, date, initials: fill only when explicitly supported.

Return no markdown, no commentary, and no extra keys.$$,
  $$<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Context Record</title>
    <style>
      :root {
        color-scheme: light;
        font-family: "Helvetica Neue", Arial, sans-serif;
      }
      body {
        margin: 24px;
        color: #241c18;
      }
      .sheet {
        border: 2px solid #3f332d;
      }
      .title {
        border-bottom: 2px solid #3f332d;
        font-size: 28px;
        font-weight: 800;
        letter-spacing: 0.08em;
        padding: 12px 18px;
        text-align: center;
      }
      .grid {
        display: grid;
        grid-template-columns: 1.2fr 1.6fr 1fr;
      }
      .cell {
        border-right: 1px solid #3f332d;
        border-bottom: 1px solid #3f332d;
        min-height: 56px;
        padding: 10px 12px;
      }
      .cell:last-child {
        border-right: 0;
      }
      .label {
        display: block;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.04em;
        margin-bottom: 6px;
        text-transform: uppercase;
      }
      .value {
        font-size: 14px;
        line-height: 1.4;
        white-space: pre-wrap;
      }
      .section {
        border-bottom: 1px solid #3f332d;
        padding: 12px 16px;
      }
      .section h2 {
        font-size: 13px;
        letter-spacing: 0.04em;
        margin: 0 0 8px;
        text-transform: uppercase;
      }
      .section p {
        font-size: 14px;
        line-height: 1.5;
        margin: 0;
        white-space: pre-wrap;
      }
      .finds {
        display: grid;
        gap: 8px 16px;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .finds li {
        font-size: 13px;
      }
      .footer {
        display: grid;
        grid-template-columns: 2fr 1fr;
      }
    </style>
  </head>
  <body>
    <article class="sheet">
      <div class="title">CONTEXT RECORD</div>
      <section class="grid">
        <div class="cell">
          <span class="label">Site</span>
          <div class="value">{{site.code}} {{site.name}}</div>
        </div>
        <div class="cell">
          <span class="label">Additional Sheets</span>
          <div class="value">{{additionalSheets}}</div>
        </div>
        <div class="cell">
          <span class="label">Context No.</span>
          <div class="value">{{contextNumber}}</div>
        </div>
        <div class="cell">
          <span class="label">Trench</span>
          <div class="value">{{trench}}</div>
        </div>
        <div class="cell">
          <span class="label">Relationships</span>
          <div class="value">Overlain by: {{relationships.overlainBy}}
Abutted by: {{relationships.abuttedBy}}
Cut by: {{relationships.cutBy}}
Filled by: {{relationships.filledBy}}
Same as: {{relationships.sameAs}}
Part of: {{relationships.partOf}}
Consists of: {{relationships.consistsOf}}
Overlies: {{relationships.overlies}}
Butts: {{relationships.butts}}
Cuts: {{relationships.cuts}}
Fill of: {{relationships.fillOf}}
Uncertain: {{relationships.uncertain}}</div>
        </div>
        <div class="cell">
          <span class="label">Type</span>
          <div class="value">{{contextType}}</div>
        </div>
        <div class="cell">
          <span class="label">Plan No.</span>
          <div class="value">{{planNumber}}</div>
        </div>
        <div class="cell">
          <span class="label">Section No.</span>
          <div class="value">{{sectionNumber}}</div>
        </div>
        <div class="cell">
          <span class="label">Coordinates / Level</span>
          <div class="value">{{coordinates}}
{{level}}</div>
        </div>
      </section>
      <section class="section">
        <h2>Description</h2>
        <p>{{description}}</p>
      </section>
      <section class="section">
        <h2>Interpretation / Discussion</h2>
        <p>{{interpretationDiscussion}}</p>
      </section>
      <section class="section">
        <h2>Temporal Sequence</h2>
        <p>Above: {{temporalSequence.above}}
Current: {{temporalSequence.current}}
Below: {{temporalSequence.below}}</p>
      </section>
      <section class="section">
        <h2>Finds</h2>
        <ul class="finds">
          <li>None: {{finds.none}}</li>
          <li>Pot: {{finds.pot}}</li>
          <li>Bone: {{finds.bone}}</li>
          <li>Flint: {{finds.flint}}</li>
          <li>Stone: {{finds.stone}}</li>
          <li>Burnt stone: {{finds.burntStone}}</li>
          <li>Glass: {{finds.glass}}</li>
          <li>Metal: {{finds.metal}}</li>
          <li>CBM: {{finds.cbm}}</li>
          <li>Wood: {{finds.wood}}</li>
          <li>Leather: {{finds.leather}}</li>
          <li>Other: {{finds.other}}</li>
        </ul>
      </section>
      <section class="footer">
        <div class="section">
          <h2>Small Finds / Samples / Building Materials</h2>
          <p>Small finds: {{smallFinds}}
Samples: {{samples}}
Building materials: {{buildingMaterials}}</p>
        </div>
        <div class="section">
          <h2>Recorder</h2>
          <p>{{recorder}}</p>
          <h2>Date</h2>
          <p>{{date}}</p>
          <h2>Initials</h2>
          <p>{{initials}}</p>
        </div>
      </section>
    </article>
  </body>
</html>$$
where not exists (
  select 1
  from public.context_sheet_templates
  where user_id is null
);
