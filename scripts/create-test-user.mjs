// Create (or confirm) a test user via the service role — bypasses email
// confirmation so the login flow can be exercised locally.
//
// Usage: node --env-file=.env.local scripts/create-test-user.mjs [email] [password]

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('✗ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
  process.exit(1)
}

const email = process.argv[2] ?? 'founder@simvites.test'
const password = process.argv[3] ?? 'Simvites!2026'

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name: 'Test Founder' },
})

if (error) {
  if (/already.*registered|exists/i.test(error.message)) {
    console.log(`• user ${email} already exists — leaving as is`)
    process.exit(0)
  }
  console.error(`✗ ${error.message}`)
  process.exit(1)
}

console.log(`✓ created confirmed user: ${email}  (password: ${password})  id=${data.user?.id}`)
