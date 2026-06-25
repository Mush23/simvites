-- ─────────────────────────────────────────────────────────────────────────
-- Seed: Template #1 "Editorial Luxe" into the global templates gallery.
-- Idempotent (upsert on slug). Runs after 0001_init.sql via `supabase db reset`
-- or `supabase db push` + `psql -f supabase/seed.sql`.
--
-- Kept in sync with templates/template-one.ts (the TS source used at render
-- time). content_json (Puck page data) is filled in Phase 2.
-- ─────────────────────────────────────────────────────────────────────────

insert into public.templates (slug, name, event_type, preview_image, content_json, default_theme_json, default_events_json, is_active)
values (
  'editorial-luxe',
  'Editorial Luxe',
  'wedding',
  '/templates/editorial-luxe.jpg',
  '{"/": {"root": {"props": {}}, "content": [
    {"type": "Hero", "props": {"id": "hero-1", "kicker": "Together with their families", "titleLeft": "Maharshi", "titleRight": "Simran", "dateDisplay": "24 October 2026", "location": "London, United Kingdom", "heroImage": "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=2000&q=80"}},
    {"type": "Story", "props": {"id": "story-1", "kicker": "Our Story", "title": "How we got here", "paragraphs": [{"text": "Two families, two cities, and a love story written across a single unforgettable weekend in London."}, {"text": "From the first beat of the dhol at the Sangeet to the last dance at the Reception, we would be honoured to have you celebrate every moment with us."}]}},
    {"type": "Events", "props": {"id": "events-1"}},
    {"type": "Schedule", "props": {"id": "schedule-1"}},
    {"type": "Rsvp", "props": {"id": "rsvp-1", "deadlineDisplay": "15 July 2026"}},
    {"type": "Footer", "props": {"id": "footer-1", "coupleInitials": "M & S", "dateDisplay": "24 October 2026"}}
  ]}}'::jsonb,
  '{
    "fontHeading": "Cormorant Garamond",
    "fontBody": "Jost",
    "modeDefault": "system",
    "colors": { "light": {}, "dark": {} }
  }'::jsonb,
  '[
    {
      "key": "sangeet", "name": "Sangeet & Jago", "tagline": "An evening of music, dance & joy",
      "eventDate": "2026-10-21", "startTime": "19:00", "durationHours": 5,
      "venue": "Horizons Bar & Banqueting", "address": "39 Whitton Road, Hounslow TW3 2DB",
      "themeLabel": "Blue · Red · Orange", "accentToken": "ev-sangeet",
      "palette": ["oklch(0.5 0.16 250)", "oklch(0.5 0.2 28)", "oklch(0.68 0.17 55)"],
      "schedule": [
        {"time": "7:00 PM", "label": "Doors open"},
        {"time": "8:00 PM", "label": "Sangeet & Jago begins"},
        {"time": "12:00 AM", "label": "Celebrations close"}
      ],
      "order": 0, "visible": true
    },
    {
      "key": "vidhi", "name": "Vidhi", "tagline": "Ganesh Stapna, Haldi & family blessings",
      "eventDate": "2026-10-23", "startTime": "12:15", "durationHours": 4,
      "venue": "Beechside", "address": "Oldfield Road, Maidenhead SL6 1UA",
      "themeLabel": "Yellow · Gold", "accentToken": "ev-vidhi",
      "palette": ["oklch(0.85 0.15 95)", "oklch(0.72 0.13 80)"],
      "schedule": [
        {"time": "12:15 PM", "label": "Ganesh Stapna"},
        {"time": "Afterwards", "label": "Haldi & Family Blessings"},
        {"time": "To follow", "label": "Lunch"}
      ],
      "order": 1, "visible": true
    },
    {
      "key": "wedding", "name": "Wedding Ceremony", "tagline": "Beneath the mandap, the sacred vows",
      "eventDate": "2026-10-24", "startTime": "10:00", "durationHours": 4,
      "venue": "Radisson Blu London Heathrow", "address": "140 Bath Road, Harlington, Hayes UB3 5AW",
      "themeLabel": "Red · Gold", "accentToken": "ev-wedding",
      "palette": ["oklch(0.45 0.18 28)", "oklch(0.72 0.13 80)"],
      "schedule": [
        {"time": "9:30 AM", "label": "Jaan arrival"},
        {"time": "10:00 AM", "label": "Ceremony begins"},
        {"time": "Afterwards", "label": "Lunch"}
      ],
      "order": 2, "visible": true
    },
    {
      "key": "reception", "name": "Reception", "tagline": "Dinner, dancing & an evening to remember",
      "eventDate": "2026-10-24", "startTime": "18:00", "durationHours": 5,
      "venue": "Radisson Blu London Heathrow", "address": "140 Bath Road, Harlington, Hayes UB3 5AW",
      "themeLabel": "Navy · Gold", "accentToken": "ev-reception",
      "palette": ["oklch(0.34 0.08 265)", "oklch(0.72 0.13 80)"],
      "schedule": [
        {"time": "6:00 PM", "label": "Champagne reception & canapés"},
        {"time": "7:30 PM", "label": "Dinner"},
        {"time": "Afterwards", "label": "Dancing"}
      ],
      "order": 3, "visible": true
    }
  ]'::jsonb,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  event_type = excluded.event_type,
  preview_image = excluded.preview_image,
  content_json = excluded.content_json,
  default_theme_json = excluded.default_theme_json,
  default_events_json = excluded.default_events_json,
  is_active = excluded.is_active,
  updated_at = now();
