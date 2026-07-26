import { PageHeader } from '@/components/app/ui'
import { aiConfigured } from '@/lib/ai'
import { AssistantChat } from './assistant-chat'
import { BRAND_NAME } from '@/lib/brand'

export const metadata = { title: `Assistant · ${BRAND_NAME}` }

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-[880px] px-6 py-7">
      <PageHeader
        eyebrow="Assistant"
        title="Ask about your wedding"
        description="Your planning assistant knows your guests, RSVPs, budget, vendors, tasks and payments. Ask it anything, or have it draft a message."
      />
      <AssistantChat configured={aiConfigured()} />
    </div>
  )
}
