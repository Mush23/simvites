import { createClient } from '@/lib/supabase/server'
import { track } from '@/lib/analytics'
import { computeSiteExpiry, laterOf } from '@/lib/site-expiry'

/**
 * Serialise pages + visible events + theme + labels into an immutable
 * published_versions snapshot and flip the site to 'published'. The public
 * site reads ONLY this snapshot (handoff §7). Shared by the editor's
 * Publish and the app header's Publish (overhaul).
 *
 * M4: this used to say "Caller checks unlock" — and one of the two callers
 * checked it against the WRONG site. `saveAndPublish` gated on
 * getPrimarySite().isUnlocked but published a client-supplied siteId, so
 * anyone who could reach two sites (pay for one, get added as a collaborator
 * on another) could publish the locked one for free. The entitlement check now
 * lives here, next to the write it protects, against the site actually being
 * published. A caller cannot forget it.
 */
export async function publishSnapshot(siteId: string, summary = 'Published from the editor') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: site }, { data: pages }, { data: events }, { data: itinerary }] = await Promise.all([
    supabase.from('sites').select('title, slug, theme, labels, is_unlocked').eq('id', siteId).maybeSingle(),
    supabase.from('pages').select('slug, title, puck_data, is_home, nav_order, hidden').eq('site_id', siteId),
    supabase
      .from('events')
      .select('id, name, starts_at, ends_at, venue_name, address, description, accent, visibility, on_website, sort_order')
      .eq('site_id', siteId)
      .is('archived_at', null)
      .neq('visibility', 'hidden')
      .eq('on_website', true)
      .order('sort_order', { ascending: true })
      .order('starts_at', { ascending: true }),
    supabase.from('event_itinerary')
      .select('event_id, time_label, title, note, sort_order')
      .eq('site_id', siteId).order('sort_order'),
  ])
  // RLS already scoped the read, so a missing row means "not yours".
  if (!site) return { error: 'Site not found.' }
  // The business model (handoff §7): free tier = draft + preview only.
  // Checked against THIS site, not whichever one the caller happened to load.
  if (!site.is_unlocked) return { error: 'locked', locked: true as const }

  // Fold each event's itinerary into the event so it freezes into the snapshot.
  const itinByEvent = new Map<string, { time_label: string | null; title: string; note: string | null }[]>()
  for (const it of itinerary ?? []) {
    const arr = itinByEvent.get(it.event_id) ?? []
    arr.push({ time_label: it.time_label, title: it.title, note: it.note })
    itinByEvent.set(it.event_id, arr)
  }
  const eventsWithItinerary = (events ?? []).map((e) => ({ ...e, itinerary: itinByEvent.get(e.id) ?? [] }))

  const snapshot = {
    schema_version: 1,
    title: site.title,
    slug: site.slug,
    theme: site.theme,
    labels: site.labels,
    pages: pages ?? [],
    events: eventsWithItinerary,
  }

  const { error: insErr } = await supabase
    .from('published_versions')
    .insert({ site_id: siteId, snapshot, summary, published_by: user?.id ?? null })
  if (insErr) return { error: insErr.message }

  // Lifecycle (readiness #5a): hosting runs for 18 months AFTER THE WEDDING,
  // floored at 18 months from publish. This used to be 18 months from first
  // publish, which for a save-the-date published a year ahead delivered about
  // four months after the wedding — while three places on the marketing site
  // promised eighteen. See lib/site-expiry.ts.
  //
  // Recomputed on EVERY publish rather than only the first, so moving the
  // wedding date moves the expiry with it. `laterOf` means that can only ever
  // extend: a manual extension from platform admin is never clawed back.
  const [{ data: cur }, { data: dated }] = await Promise.all([
    supabase.from('sites').select('expires_at').eq('id', siteId).maybeSingle(),
    // ALL live events, not just the ones shown on the website — a private
    // family dinner is still part of the wedding for lifecycle purposes.
    supabase.from('events').select('starts_at').eq('site_id', siteId)
      .is('archived_at', null).not('starts_at', 'is', null)
      .order('starts_at', { ascending: false }).limit(1),
  ])
  const lastEventAt = (dated as { starts_at: string }[] | null)?.[0]?.starts_at ?? null
  const expiry = laterOf(
    cur?.expires_at as string | null,
    computeSiteExpiry(lastEventAt ? new Date(lastEventAt) : null, new Date()),
  )
  const { error: updErr } = await supabase.from('sites')
    .update({ status: 'published', expires_at: expiry.toISOString() })
    .eq('id', siteId)
  if (updErr) return { error: updErr.message }

  await supabase.from('activity_log').insert({
    site_id: siteId, actor_id: user?.id ?? null, verb: 'published', entity_type: 'site', entity_id: siteId,
  })
  if (user) track('site_published', user.id, { site_id: siteId })
  return { ok: true as const }
}
