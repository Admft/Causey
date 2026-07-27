-- Allow unknown entry fees (scrapers often lack structured EF data).
-- null = fee not listed; 0 = explicitly free / no charge.

alter table public.competitions
  alter column entry_fee_cents drop not null;

alter table public.competitions
  alter column entry_fee_cents set default null;

comment on column public.competitions.entry_fee_cents is
  'Entry fee in cents. null = not listed on the source page; 0 = free.';
