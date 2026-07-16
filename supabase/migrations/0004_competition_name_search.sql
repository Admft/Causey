-- Fast case-insensitive tournament-name search for the discovery API.
create extension if not exists pg_trgm;

create index if not exists competitions_name_trgm_idx
  on competitions using gin (name gin_trgm_ops);
