-- 0008 — site lifecycle. Hosting isn't forever: sites carry an expiry
-- (defaulted to ~18 months at first publish) and can be archived (by the
-- couple lapsing or by platform admin). Public rendering checks both.
alter table sites add column if not exists expires_at timestamptz;
alter table sites add column if not exists archived_at timestamptz;
