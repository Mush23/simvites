import { LEGAL_ENTITY, type LegalEntityField } from '@/lib/legal'

/**
 * A detail the notice is legally required to state and that only the business
 * can supply. Renders the value once it exists, and an unmissable red marker
 * until then — the absence has to be visible on the page, because a privacy
 * notice missing its controller's identity reads as complete to everyone
 * except the regulator.
 */
export function Entity({ field, label }: { field: LegalEntityField; label: string }) {
  const value = LEGAL_ENTITY[field]
  if (value) return <>{value}</>
  return <span className="legal-todo">[{label} — to be completed]</span>
}

/**
 * A question this draft could not settle. Shown to the reader rather than
 * hidden in a code comment: if the page ships before a solicitor has resolved
 * it, the reader deserves to know which part is uncertain.
 */
export function OpenQuestion({ children }: { children: React.ReactNode }) {
  return (
    <aside className="legal-open-question">
      <p>
        <strong>Unresolved — pending legal review.</strong>
      </p>
      {children}
    </aside>
  )
}

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="legal-table-wrap">{children}</div>
}
