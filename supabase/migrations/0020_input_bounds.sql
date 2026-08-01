-- ═══════════════════════════════════════════════════════════════════════
-- 0020 — Length bounds on guest-writable input (misuse review M9).
--
-- The schema had NO length constraint anywhere: every text column was
-- unbounded `text` and rsvp_answers.value was unbounded `jsonb`. The only
-- caps in the system were ad-hoc slices in application code (the RSVP message
-- at 1000 chars, the slug at 40) — and the RSVP write path runs under the
-- SERVICE ROLE, so it bypasses RLS and every application-layer assumption
-- with it. A guest could store megabytes per answer, once per question, ten
-- times a minute.
--
-- App-level clamps landed alongside this in the RSVP action. These constraints
-- are the layer underneath: they hold even if a future caller forgets, or
-- writes through the RPC directly.
--
-- Limits are deliberately generous — roughly 10× the largest plausible real
-- value — so this rejects abuse, not long answers. Every existing row in a
-- normally-used database satisfies them.
--
-- NOT VALID + VALIDATE is used so the ACCESS EXCLUSIVE lock is brief: the
-- table is only scanned during VALIDATE, which takes a weaker lock. On a
-- pre-launch database this is academic, but the pattern is right.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Guest-controlled: written by submit_response under the service role ──

-- A free-text RSVP answer. 16 KB of JSON is far past any real reply and still
-- leaves room for a multi_choice array of long option labels.
alter table rsvp_answers
  drop constraint if exists rsvp_answers_value_size;
alter table rsvp_answers
  add constraint rsvp_answers_value_size
  check (pg_column_size(value) <= 16384) not valid;
alter table rsvp_answers validate constraint rsvp_answers_value_size;

-- The household's note to the couple. The action clamps to 1000; allow more
-- here so the constraint is a backstop rather than a duplicate of the rule.
alter table responses
  drop constraint if exists responses_message_len;
alter table responses
  add constraint responses_message_len
  check (message is null or char_length(message) <= 4000) not valid;
alter table responses validate constraint responses_message_len;

-- ── Couple-controlled: bounded so one account cannot bloat shared storage ──

alter table guests
  drop constraint if exists guests_text_len;
alter table guests
  add constraint guests_text_len
  check (
    char_length(full_name) <= 200
    and (email is null or char_length(email) <= 320)      -- RFC 5321 max
    and (phone is null or char_length(phone) <= 40)
    and (dietary is null or char_length(dietary) <= 2000)
    and (note is null or char_length(note) <= 2000)
  ) not valid;
alter table guests validate constraint guests_text_len;

alter table households
  drop constraint if exists households_name_len;
alter table households
  add constraint households_name_len
  check (char_length(name) <= 200) not valid;
alter table households validate constraint households_name_len;

alter table sites
  drop constraint if exists sites_title_len;
alter table sites
  add constraint sites_title_len
  check (char_length(title) <= 200) not valid;
alter table sites validate constraint sites_title_len;

-- Slug is already clamped to 40 by normalizeSlug; make it structural, and
-- enforce the shape the router assumes (lowercase, no leading/trailing dash).
alter table sites
  drop constraint if exists sites_slug_shape;
alter table sites
  add constraint sites_slug_shape
  check (slug ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$') not valid;
alter table sites validate constraint sites_slug_shape;
