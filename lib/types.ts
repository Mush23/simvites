// ─────────────────────────────────────────────────────────────────────────
// Domain types — mirror supabase/migrations/0001_init.sql.
// Hand-written for now; once the Supabase project exists these can be
// regenerated with `supabase gen types typescript`.
// ─────────────────────────────────────────────────────────────────────────

export type OrgRole = 'owner' | 'collaborator'
export type SiteStatus = 'draft' | 'published'
export type ThemeMode = 'light' | 'dark' | 'system'
export type EventSiteType =
  | 'wedding'
  | 'engagement'
  | 'reception'
  | 'party'
  | 'corporate'
  | 'other'
export type InviteChannel = 'email' | 'whatsapp' | 'sms'
export type SendStatus =
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'bounced'
  | 'failed'
  | 'opened'
export type RsvpStatus = 'active' | 'superseded'
export type DomainType = 'platform_subdomain' | 'custom'
export type SslStatus = 'pending' | 'provisioning' | 'active' | 'error'

// ── Theme tokens ──────────────────────────────────────────────────────────
// OKLCH strings keyed by token name, one set per mode. Blocks read these via
// CSS custom properties injected at the site root, so a colour change cascades.
export interface ThemeColorTokens {
  background: string
  foreground: string
  card: string
  'card-foreground': string
  primary: string
  'primary-foreground': string
  secondary: string
  'secondary-foreground': string
  muted: string
  'muted-foreground': string
  accent: string
  'accent-foreground': string
  border: string
  ring: string
  gold: string
  'gold-ink': string
  'deep-red': string
  [token: string]: string
}

// A site stores only the tokens that DIFFER from the globals.css defaults;
// they're injected as inline CSS custom properties at the site root and the
// rest cascade from globals. So both modes are partial override maps.
export interface ThemeTokens {
  light: Partial<ThemeColorTokens>
  dark: Partial<ThemeColorTokens>
}

export interface SiteTheme {
  fontHeading: string
  fontBody: string
  modeDefault: ThemeMode
  colors: ThemeTokens
}

// ── Events ──────────────────────────────────────────────────────────────
export interface ScheduleItem {
  time: string
  label: string
}

export interface EventRecord {
  id: string
  key: string
  name: string
  tagline?: string
  eventDate?: string // ISO date "YYYY-MM-DD"; format with formatEventDate() for display
  startTime?: string // 24h "HH:mm"
  durationHours?: number
  venue?: string
  address?: string
  themeLabel?: string
  palette: string[] // OKLCH swatches
  accentToken?: string // e.g. "ev-sangeet"
  coverImage?: string
  schedule: ScheduleItem[]
  order: number
  visible: boolean
}

// ── Guests & RSVP engine (ported USP) ─────────────────────────────────────
export interface Household {
  id: string
  name: string
  code: string
  notes?: string
}

export interface Guest {
  id: string
  householdId: string
  name: string
  isChild: boolean
}

// Two-level invites (brief §10). Household level controls visibility + capacity;
// per-guest level supports exceptions (MVP auto-derives it from the household).
export interface HouseholdEventInvite {
  householdId: string
  eventId: string
  invited: boolean
  visible: boolean
  householdCap: number // 0 / not-invited ⇒ event hidden for this household
}

export interface GuestEventInvite {
  guestId: string
  eventId: string
  invited: boolean
}

export interface RsvpEventResponse {
  guestId: string
  eventId: string
  attending: boolean
}

/** A guest's RSVP. Non-destructive: a new active submission supersedes the prior. */
export interface RsvpSubmission {
  id: string
  householdId: string
  status: RsvpStatus
  submittedBy?: string
  message?: string
  submittedAt: string
  responses: RsvpEventResponse[]
}

// ── Site (the resolved tenant) ─────────────────────────────────────────────
export interface Site {
  id: string
  orgId: string
  eventType: EventSiteType
  name: string
  slug: string
  status: SiteStatus
  timezone: string
  rsvpDeadline?: string // ISO date
  theme: SiteTheme
  events: EventRecord[]
}

// ── Templates (data-only gallery) ──────────────────────────────────────────
export interface TemplateDefinition {
  slug: string
  name: string
  eventType: EventSiteType
  previewImage?: string
  /** Puck page content keyed by page path, e.g. { "/": PuckData }. */
  content: Record<string, unknown>
  defaultTheme: SiteTheme
  defaultEvents: Omit<EventRecord, 'id'>[]
}
