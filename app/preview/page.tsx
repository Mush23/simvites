import { TemplateOne } from '@/components/template-one'
import { demoSite, defaultContent } from '@/templates/template-one'

export const metadata = {
  title: 'Editorial Luxe — Template Preview · Simvites',
}

/** Apex demo of Template #1, rendered from the bundled demo site data. */
export default function PreviewPage() {
  return <TemplateOne site={demoSite} content={defaultContent} guestName="Our Guest" />
}
