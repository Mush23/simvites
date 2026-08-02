-- ═══════════════════════════════════════════════════════════════════════
-- 0023 — One guest per name per household (click-through finding C2).
--
-- `importGuests` had always skipped a guest already present, keyed on
-- household + lowercased name. `addGuest` had no check at all, so pasting a
-- spreadsheet deduped and typing the same name did not — and adding the same
-- person twice silently produced two guests. Duplicates are the commonest
-- guest-list data problem and they inflate the headcount a caterer quotes from.
--
-- The application now applies the same rule at both doors. This index is the
-- backstop: it also closes the race between the check and the insert, and it
-- holds for any future write path that forgets.
--
-- Scoped to LIVE guests only. Archiving someone and re-adding them is a normal
-- correction, and archived rows must not block it.
--
-- Deliberately NOT unique on email: a couple sharing one inbox is ordinary at a
-- wedding, so two guests may share an address. They must simply not be mailed
-- twice, which lib/guests.ts `dedupeEmails` handles at send time.
-- ═══════════════════════════════════════════════════════════════════════

-- Existing rows were checked before writing this: zero duplicate
-- (household, lower(name)) groups, so the index builds without a rewrite.
create unique index if not exists guests_unique_name_per_household
  on guests (household_id, lower(btrim(full_name)))
  where archived_at is null;

-- Emails are stored lowercase from now on so every Set-based dedupe matches.
-- Normalise what is already there; a no-op on a clean database.
update guests
  set email = lower(btrim(email))
  where email is not null and email <> lower(btrim(email));
