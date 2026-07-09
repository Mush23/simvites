import 'server-only'
import { createAdminClient } from '@/lib/supabase/server'
import { UNLOCK_AMOUNT, UNLOCK_CURRENCY } from '@/lib/stripe'

// E5: platform pricing lives in platform_settings so the founder can change
// it from /admin without a deploy. Falls back to the code constant if the
// row is missing (fresh environments keep working).

export interface UnlockPrice {
  amount: number // pence
  currency: string
  label: string
}

export async function getUnlockPrice(): Promise<UnlockPrice> {
  try {
    const db = createAdminClient()
    const { data } = await db.from('platform_settings').select('value').eq('key', 'unlock_price').maybeSingle()
    const v = data?.value as Partial<UnlockPrice> | undefined
    if (v && typeof v.amount === 'number' && v.amount >= 100) {
      return { amount: v.amount, currency: v.currency ?? UNLOCK_CURRENCY, label: v.label ?? 'Wedding package' }
    }
  } catch { /* fall through to the constant */ }
  return { amount: UNLOCK_AMOUNT, currency: UNLOCK_CURRENCY, label: 'Wedding package' }
}
