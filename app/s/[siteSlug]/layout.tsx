import { templateFontClasses } from '@/lib/template-fonts'

/** Public-site layout: loads the template font pool for every published site. */
export default function PublicSiteLayout({ children }: { children: React.ReactNode }) {
  return <div className={templateFontClasses}>{children}</div>
}
