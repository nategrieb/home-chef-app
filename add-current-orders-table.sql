-- Create a single-record table to store the active order draft/selection.
create table if not exists current_orders (
  id text primary key,
  recipe_id uuid references recipes(id) on delete set null,
  order_title text not null default '',
  order_notes text,
  order_ingredients jsonb not null default '[]'::jsonb,
  order_instructions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Seed a default row so the app can upsert consistently using id='current'.
insert into current_orders (id)
values ('current')
on conflict (id) do nothing;
