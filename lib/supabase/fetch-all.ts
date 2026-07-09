// PostgREST (Supabase) caps a single select at `max-rows` (default 1000).
// Any site-wide fetch that can exceed that — invitations, responses,
// rsvp_answers on a large wedding — is silently TRUNCATED, which corrupts the
// invite matrix, RSVP counts and CSV exports. fetchAll pages through with
// .range() until the table is exhausted, so correctness never depends on the
// guest list staying under 1000 rows.
//
// Pass a factory that returns a FRESH filtered builder each call (a builder is
// single-use once awaited): fetchAll(() => supabase.from('x').select('…').eq('site_id', id))

interface Rangeable<T> {
  range(from: number, to: number): PromiseLike<{ data: T[] | null; error: { message: string } | null }>
}

export async function fetchAll<T>(make: () => Rangeable<T>, page = 1000): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += page) {
    const { data, error } = await make().range(from, from + page - 1)
    if (error) throw new Error(error.message)
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < page) break
  }
  return out
}
