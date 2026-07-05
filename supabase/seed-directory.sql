-- ═══════════════════════════════════════════════════════════════════════
-- Vendor recommendations directory seed (idempotent — upsert by name).
-- Platform-curated South-Asian-wedding suppliers across every category, each
-- with a couple/planner mention. Re-runnable: rows are matched by name.
-- Run: node --env-file=.env.local scripts/db-apply.mjs supabase/seed-directory.sql
-- ═══════════════════════════════════════════════════════════════════════

create unique index if not exists vendor_directory_name_uidx on vendor_directory (name);

insert into vendor_directory (category, name, tagline, blurb, location, price_band, website, instagram, rating, featured, sort_order)
values
  ('catering', 'Saffron & Sage', 'Modern Indian banqueting', 'Multi-cuisine wedding caterers known for live sangeet street-food stations and plated ceremony dinners. Halal and Jain menus on request.', 'London & Home Counties', '£££', 'https://example.com/saffron', '@saffronandsage', 4.9, true, 10),
  ('catering', 'The Copper Degh', 'Heritage Punjabi kitchens', 'Family-run caterers doing big, generous North-Indian feasts. Famous for their butter chicken and a dedicated chaat counter.', 'Birmingham & Midlands', '££', 'https://example.com/copperdegh', '@thecopperdegh', 4.7, false, 20),
  ('dj', 'Dhol & Bass', 'Dhol players meet a DJ booth', 'A DJ-and-live-dhol duo who read the room, blend Bollywood, bhangra, Afrobeats and UK garage, and keep the floor full until close.', 'Nationwide', '£££', 'https://example.com/dholbass', '@dholandbass', 4.9, true, 10),
  ('dj', 'Ministry of Mehfil', 'Boutique wedding DJs', 'Beat-matched sets with tasteful uplighting included. Great for couples who want a curated vibe rather than the loudest speakers.', 'Manchester & North', '££', 'https://example.com/mehfil', '@ministryofmehfil', 4.6, false, 20),
  ('decor', 'Marigold & Mandap', 'Floral mandaps & stage design', 'Full-service decor: mandaps, stage backdrops, table florals and aisle installations. They handle install and breakdown so you never lift a garland.', 'London & South East', '££££', 'https://example.com/marigold', '@marigoldandmandap', 5.0, true, 10),
  ('decor', 'Lotus Lane Events', 'Elegant, editorial styling', 'Understated, magazine-worthy decor with a restrained palette. Perfect for gallery-calm ceremonies and intimate receptions.', 'Bristol & South West', '£££', 'https://example.com/lotuslane', '@lotuslaneevents', 4.8, false, 20),
  ('coordinator', 'The Wedding Whisperers', 'On-the-day coordination', 'Day-of coordinators who run your timeline, wrangle vendors and handle every hiccup so both families can actually be guests.', 'Nationwide', '£££', 'https://example.com/whisperers', '@weddingwhisperers', 4.9, true, 10),
  ('coordinator', 'Knot & Order', 'Full planning & logistics', 'End-to-end planners for multi-day weddings: budgets, run sheets, supplier management and a calm presence in the chaos.', 'London & Home Counties', '££££', 'https://example.com/knotandorder', '@knotandorder', 4.8, false, 20),
  ('entertainment', 'Rhythm Nation Dancers', 'Bollywood dance troupe', 'A high-energy dance crew for sangeet showcases and surprise reception numbers, with optional choreography lessons for the couple.', 'Nationwide', '£££', 'https://example.com/rhythmnation', '@rhythmnationuk', 4.7, true, 10),
  ('entertainment', 'The Baraat Band', 'Live dhol & brass procession', 'A full baraat procession band — dhol, brass and a horse if you want one. They make the groom''s arrival unforgettable.', 'Leeds & North', '£££', 'https://example.com/baraatband', '@thebaraatband', 4.8, false, 20),
  ('photography', 'Golden Hour Studios', 'Cinematic wedding films', 'Photo and film team specialising in warm, candid, documentary coverage across every event of the weekend. Same-day highlight reels available.', 'London & nationwide', '££££', 'https://example.com/goldenhour', '@goldenhourstudios', 5.0, true, 10),
  ('photography', 'Frame & Feather', 'Natural-light photography', 'Two-shooter couples who capture the quiet moments — the nervous dad, the giggling cousins — not just the posed portraits.', 'Manchester & North', '£££', 'https://example.com/frameandfeather', '@frameandfeather', 4.8, false, 20),
  ('florals', 'Petal & Thread', 'Bespoke wedding florals', 'Seasonal, British-grown flowers for bouquets, garlands and centrepieces, with a sustainable, low-waste approach.', 'Surrey & London', '£££', 'https://example.com/petalthread', '@petalandthread', 4.7, false, 30),
  ('mehndi', 'Henna House', 'Bridal & guest mehndi', 'Award-winning henna artists for the bride plus fast-turnaround guest stations so no auntie is left waiting.', 'Nationwide', '££', 'https://example.com/hennahouse', '@hennahouseuk', 4.9, false, 30),
  ('transport', 'Regal Rides', 'Luxury wedding cars', 'Vintage and modern luxury cars, plus decorated entrance vehicles for the baraat. Chauffeurs in traditional dress on request.', 'London & Home Counties', '£££', 'https://example.com/regalrides', '@regalridesuk', 4.6, false, 40),
  ('cake', 'Sugar & Spice Bakehouse', 'Show-stopping wedding cakes', 'Multi-tier cakes and dessert tables with eggless and vegan options, styled to match your event palette.', 'Birmingham & Midlands', '££', 'https://example.com/sugarspice', '@sugarspicebakehouse', 4.7, false, 40)
on conflict (name) do update set
  category = excluded.category, tagline = excluded.tagline, blurb = excluded.blurb,
  location = excluded.location, price_band = excluded.price_band, website = excluded.website,
  instagram = excluded.instagram, rating = excluded.rating, featured = excluded.featured,
  sort_order = excluded.sort_order;

-- Mentions (clear + reinsert for the seeded set so re-runs stay clean).
delete from vendor_mentions where directory_id in (select id from vendor_directory);
insert into vendor_mentions (directory_id, quote, author, source)
select id, q, a, s from vendor_directory d
join (values
  ('Saffron & Sage', 'The chaat station had a queue all night — our guests still talk about it.', 'Aanya & Dev, Sep 2026', 'Verified couple'),
  ('The Copper Degh', 'Fed 350 people piping hot food without a single delay. Faultless.', 'Priya & Sunil, Jul 2026', 'Verified couple'),
  ('Dhol & Bass', 'They read the crowd perfectly and the dhol entrance gave everyone goosebumps.', 'Ravi & Meena, Aug 2026', 'Verified couple'),
  ('Ministry of Mehfil', 'Tasteful, never cheesy, and the uplighting transformed the hall.', 'Sana & Imran, Jun 2026', 'Verified couple'),
  ('Marigold & Mandap', 'Walked in to the mandap of my Pinterest dreams. Install was seamless.', 'Nisha & Arjun, May 2026', 'Verified couple'),
  ('Lotus Lane Events', 'Elegant and calm — exactly the editorial look we wanted.', 'The Kapoor–Shah wedding', 'Planner'),
  ('The Wedding Whisperers', 'I actually enjoyed my own wedding because they handled everything.', 'Divya & Karan, Sep 2026', 'Verified couple'),
  ('Knot & Order', 'Three events, two venues, zero stress. Worth every penny.', 'The Patel–Rao weekend', 'Planner'),
  ('Rhythm Nation Dancers', 'Our surprise reception dance brought the house down — they taught us everything.', 'Aisha & Rohan, Aug 2026', 'Verified couple'),
  ('The Baraat Band', 'The whole street came out to watch the baraat. Unreal energy.', 'Vikram & Leena, Jul 2026', 'Verified couple'),
  ('Golden Hour Studios', 'The same-day highlight reel had the whole family in tears at the reception.', 'Aanya & Dev, Sep 2026', 'Verified couple'),
  ('Frame & Feather', 'They caught the moments we never saw. The candids are our favourites.', 'Simran & Jay, Jun 2026', 'Verified couple')
) as m(name, q, a, s) on m.name = d.name;
