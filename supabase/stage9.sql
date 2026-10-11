-- Stage 9: profile showcase (up to 12 cards displayed in "plastic cases"). Safe to run more than once.
-- Run this in the Supabase SQL editor before using the new PAMERAN feature.
alter table profiles add column if not exists showcase integer[] not null default '{}';
