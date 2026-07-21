-- Optional cover image scraped from the event / organizer page.
-- Null is normal — many listings have no usable photo. The UI must not
-- reserve empty image chrome when this is null.
alter table competitions
  add column if not exists image_url text;

comment on column competitions.image_url is
  'Best-effort cover image from the upstream/organizer page. Null when none found.';
