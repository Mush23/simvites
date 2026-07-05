import { PageHeader } from '@/components/app/ui'
import { aiConfigured } from '@/lib/ai'
import { AssistantChat } from './assistant-chat'

export const metadata = { title: 'Assistant · Occasio' }

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
