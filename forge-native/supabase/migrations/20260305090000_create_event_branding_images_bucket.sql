-- Phase 10: Runtime hero branding image uploads.
-- Creates a dedicated public bucket for event-scoped hero/banner images.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'event-branding-images',
  'event-branding-images',
  true,
  2000000,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
