import { Render } from '@puckeditor/core/rsc'
import { siteConfig } from '@/lib/puck/config'
import { siteStyleProps } from '@/lib/site-style'
import { templateFontClasses } from '@/lib/template-fonts'
import { getTemplate } from '@/lib/templates/registry'
import { applySeed, thumbDoc, type PreviewSeed } from '@/lib/templates/seed'

// Phase 3.2 — ONE component tree.
//
// This renders a template exactly the way app/s/[siteSlug]/page.tsx renders a
// published site: the same `siteConfig` block library, the same `Render`, the
// same CSS-variable theme applied at [data-site-root] via siteStyleProps. The
// only difference is where the document comes from — a template's starter doc
// with a seed substituted, instead of the couple's saved page.
//
// That is the whole point. Previously the gallery used a hand-built mock card
// (a fake hero, three invented event rows, a divider) which rendered template
// *tokens* but not template *blocks* — so what a couple previewed and what they
// got were two different pieces of code, free to drift. They no longer can.

export function TemplateRender({
  templateKey,
  seed,
  truncate,
  fullHeight,
}: {
  templateKey: string
  seed: PreviewSeed
  /** Render only the first N blocks — for thumbnails. Omit for a full page. */
  truncate?: number
  /** Fill the viewport, so the app's own body background never shows behind a
   *  short template inside the preview iframe. */
  fullHeight?: boolean
}) {
  const template = getTemplate(templateKey)
  const styleProps = siteStyleProps({ template: templateKey })
  const base = truncate ? thumbDoc(template.starterDoc, truncate) : template.starterDoc
  const doc = applySeed(base, seed)

  return (
    <div className={templateFontClasses}>
      <div data-site-root className={`bg-paper text-ink${fullHeight ? ' min-h-screen' : ''}`} {...styleProps}>
        <Render config={siteConfig} data={doc} metadata={{ events: seed.events }} />
      </div>
    </div>
  )
}
