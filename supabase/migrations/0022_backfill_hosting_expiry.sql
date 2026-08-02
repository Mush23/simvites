-- ═══════════════════════════════════════════════════════════════════════
-- 0022 — Backfill hosting expiry onto the promised rule (readiness #5a).
--
-- lib/site-expiry.ts now computes "18 months after the wedding, floored at 18
-- months from publish", matching what three places on the marketing site have
-- always promised. New publishes get it automatically.
--
-- Sites published BEFORE that change still carry the old publish + 18 months,
-- and would only be corrected the next time their couple happens to publish —
-- which for a finished wedding may be never. This applies the new rule to them
-- once.
--
-- Only ever EXTENDS. `greatest` against the stored value means a manual
-- extension from platform admin is preserved, and no couple loses hosting they
-- have already been granted. Re-running is therefore harmless.
-- ═══════════════════════════════════════════════════════════════════════

with wedding as (
  select
    s.id as site_id,
    -- End of the celebration: the LAST live event, not the first. A mehndi on
    -- Friday and a reception on Sunday are one wedding.
    max(e.starts_at) filter (where e.archived_at is null) as last_event_at,
    -- When hosting actually started. First publish if we have one, else the
    -- site's creation — never null, so the floor below always applies.
    coalesce(min(pv.published_at), s.created_at) as published_at
  from sites s
  left join events e on e.site_id = s.id
  left join published_versions pv on pv.site_id = s.id
  where s.status = 'published'
  group by s.id, s.created_at
)
update sites s
set expires_at = greatest(
  -- never shorten
  coalesce(s.expires_at, 'epoch'::timestamptz),
  greatest(
    -- 18 months after the wedding …
    coalesce(w.last_event_at, 'epoch'::timestamptz) + interval '18 months',
    -- … floored at 18 months from when it went live
    w.published_at + interval '18 months'
  )
)
from wedding w
where w.site_id = s.id;
