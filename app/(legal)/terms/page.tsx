import type { Metadata } from 'next'
import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'
import { LEGAL_CONTACT_EMAIL } from '@/lib/legal'
import { Entity, OpenQuestion } from '../_parts'

export const metadata: Metadata = {
  title: `Terms — ${BRAND_NAME}`,
  description: `The agreement between you and ${BRAND_NAME}.`,
}

export default function TermsPage() {
  return (
    <>
      <h1>Terms</h1>
      <p>
        These are the terms you agree to by using {BRAND_NAME}. We have tried to write
        them in plain English. Nothing here takes away rights you have as a consumer
        under UK law.
      </p>

      <h2>Who you are dealing with</h2>
      <p>
        {BRAND_NAME} is operated by <Entity field="name" label="registered name" />,{' '}
        <Entity field="address" label="registered address" />, company number{' '}
        <Entity field="companyNumber" label="company number" />. You can reach us at{' '}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>

      <h2>What you get</h2>
      <p>
        {BRAND_NAME} is a tool for planning a wedding and its surrounding events: a
        website, a guest list, invitations, RSVPs, budget, vendors, tasks and seating.
      </p>
      <p>
        Building is free. You can create your site, add every event and guest, and preview
        the whole thing without paying. <strong>One payment</strong> then unlocks
        publishing your site and sending invitations. There is no subscription and no
        per-guest charge. The price is whatever is shown at checkout before you pay.
      </p>

      <h3>How long your site stays online</h3>
      <p>
        A published site stays online for <strong>18 months from the day you first
        publish it</strong>. We will remind you before it expires, and you can ask us to
        extend it.
      </p>
      <OpenQuestion>
        <p>
          Our homepage currently says 18 months <em>after the wedding</em>, which is not
          what the product does — the clock starts at first publish. If you paid on the
          strength of that wording, tell us and we will honour it. We are correcting the
          claim.
        </p>
      </OpenQuestion>
      <p>
        When a site expires it stops being publicly visible. Your data is not deleted at
        that moment — ask us and we can put it back or export it for you.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You need to be 18 or over to hold an account.</li>
        <li>
          Keep your password to yourself. You are responsible for what happens through
          your account.
        </li>
        <li>
          Anyone you share an invitation link with can reply on that
          household&rsquo;s behalf. Share them the way you would post an invitation.
        </li>
      </ul>

      <h2>Your content</h2>
      <p>
        <strong>Your wedding is yours.</strong> Your text, photos and guest list remain
        your property. You give us only the permission we need to run the service —
        storing your content, and showing it to the people you publish it to. We do not
        use it to advertise, and we do not use it to train AI models.
      </p>
      <p>By uploading something you confirm that:</p>
      <ul>
        <li>you have the right to use it — this matters most for photographs, where the
          copyright usually sits with the photographer rather than the couple;</li>
        <li>
          you have a proper basis for holding your guests&rsquo; contact details, and
          they would not be surprised to be invited;
        </li>
        <li>it is not unlawful, and does not infringe anyone else&rsquo;s rights.</li>
      </ul>
      <p>
        We do not monitor what you publish, but we may remove content and suspend an
        account if we are told it is unlawful or if it is being used to send unsolicited
        messages.
      </p>

      <h2>Guest data</h2>
      <p>
        When you upload a guest list you decide what is collected and why, so in data
        protection terms you are responsible for it and we handle it on your
        instructions. In practice: only invite people who expect to hear from you, keep
        their details accurate, and delete anyone who asks. The{' '}
        <Link href="/privacy">privacy notice</Link> sets out how we handle it and how we
        are still working out the exact split of responsibility.
      </p>

      <h2>Paying, and changing your mind</h2>
      <p>
        Payment is taken by Stripe. We never see or store your card details.
      </p>
      <p>
        Because you are buying online, you normally have <strong>14 days to cancel and
        get a full refund</strong>. If you publish your site or send invitations within
        those 14 days, you are asking us to start straight away and the cancellation
        right ends at that point — you cannot un-send an invitation.
      </p>
      <OpenQuestion>
        <p>
          For that waiver to be valid, the checkout has to ask for it explicitly and
          record your acknowledgement. It does not do that yet, so until it does we will
          honour a 14-day refund request regardless of whether you have published.
        </p>
      </OpenQuestion>
      <p>
        Outside those 14 days the payment is non-refundable, but talk to us — if the
        product did not do what we said it would, we would rather fix it or refund you
        than argue.
      </p>

      <h2>What we promise, and what we don&rsquo;t</h2>
      <p>
        We will provide the service with reasonable care and skill, as UK consumer law
        requires. We aim to keep it available at all times, but we cannot promise it will
        never go down, and we may take it offline briefly for maintenance.
      </p>
      <p>
        <strong>Please keep your own copy of anything critical.</strong> You can export
        your guest list at any time, and we would encourage you to before the wedding.
      </p>
      <p>
        Some features rely on other companies — email and SMS delivery, payments, AI
        suggestions. We choose them carefully but do not control them. AI suggestions are
        a starting point, not advice; check anything before you send it.
      </p>

      <h2>If something goes wrong</h2>
      <p>
        Nothing in these terms limits our liability for death or personal injury caused by
        our negligence, for fraud, or for anything else the law does not allow us to
        limit.
      </p>
      <p>
        Otherwise, our liability to you is limited to the amount you have paid us. We are
        not liable for indirect losses. To be plain about what that means: if the service
        fails, we can refund what you paid — we cannot underwrite the cost of a wedding.
      </p>
      <p>
        We are not responsible for anything that goes wrong between you and your guests or
        your suppliers.
      </p>

      <h2>Ending it</h2>
      <p>
        You can stop using {BRAND_NAME} and close your account whenever you like — email
        us and we will delete your data.
      </p>
      <p>
        We may suspend or close an account that breaks these terms, is used unlawfully, or
        is used to send unsolicited messages. Unless the breach is serious we will warn
        you first and give you a chance to put it right, and we will let you export your
        data.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms. If a change materially affects you we will email you
        before it takes effect. If you do not accept it you can close your account and, if
        you have paid and not yet published, ask for a refund.
      </p>

      <h2>Law</h2>
      <p>
        These terms are governed by the law of England and Wales, and the courts of
        England and Wales have jurisdiction. If you live in Scotland or Northern Ireland
        you can also bring proceedings in your own courts.
      </p>
    </>
  )
}
