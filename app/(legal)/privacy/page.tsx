import type { Metadata } from 'next'
import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'
import { LEGAL_CONTACT_EMAIL } from '@/lib/legal'
import { Entity, OpenQuestion, TableWrap } from '../_parts'

export const metadata: Metadata = {
  title: `Privacy — ${BRAND_NAME}`,
  description: `What ${BRAND_NAME} does with your data, and your guests'.`,
}

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy</h1>
      <p>
        This explains what {BRAND_NAME} collects, why, who else sees it, and how to get
        it back or deleted. It covers two different groups of people — the couple who
        run a wedding site, and the guests they invite — because those two have quite
        different relationships with us.
      </p>

      <h2>Who is responsible for your data</h2>
      <p>
        {BRAND_NAME} is operated by <Entity field="name" label="registered name" />,{' '}
        <Entity field="address" label="registered address" />
        {'. '}
        Company number <Entity field="companyNumber" label="company number" />. Registered
        with the Information Commissioner&rsquo;s Office under{' '}
        <Entity field="icoNumber" label="ICO registration number" />.
      </p>
      <p>
        For the <strong>couple&rsquo;s own data</strong> — the account, the site, the
        billing — we are the data controller.
      </p>
      <p>
        For <strong>guest data</strong>, the couple decides who to invite and what to ask
        them; we store and process it on their behalf. In most respects that makes the
        couple the controller and us their processor.
      </p>
      <OpenQuestion>
        <p>
          We also set the retention period, and we count guests for our own billing —
          decisions the couple doesn&rsquo;t make. That may make us{' '}
          <em>joint controllers</em> for guest data rather than a plain processor, which
          would change what we owe guests directly. A solicitor is reviewing this and
          this page will be updated with a definite answer before it is relied on.
        </p>
      </OpenQuestion>

      <h2>If you are a couple using {BRAND_NAME}</h2>

      <h3>What we collect</h3>
      <ul>
        <li>
          <strong>Your account</strong> — name, email address, and a password. Passwords
          are handled by our authentication provider and stored only as a hash; nobody at{' '}
          {BRAND_NAME} can see or recover them.
        </li>
        <li>
          <strong>Your wedding</strong>{' '}
          — everything you type into the app: event names,
          dates, venues, your site&rsquo;s text and photos, your budget, vendor contacts,
          tasks, seating plans and private notes.
        </li>
        <li>
          <strong>Billing</strong> — whether you have paid, and an identifier from our
          payment provider. <strong>Your card details never reach our servers</strong>;
          payment happens on the provider&rsquo;s own checkout page.
        </li>
        <li>
          <strong>Product analytics</strong> — a small number of events recording that
          something happened, so we know which parts of the product are actually used:
          creating a site, publishing it, unlocking it, starting a checkout and sending
          invitations. These carry your account or site identifier and nothing else — no
          names, no page-by-page tracking, no third-party advertising trackers.
        </li>
      </ul>

      <h3>Why we are allowed to</h3>
      <ul>
        <li>
          <strong>To provide the service</strong> (performance of our contract with you)
          — your account, your site, your guest list, your billing.
        </li>
        <li>
          <strong>To keep the service working and secure</strong> (legitimate interests) —
          error logs, abuse prevention, and the analytics above. You can object to this;
          see <a href="#rights">your rights</a>.
        </li>
        <li>
          <strong>To meet legal obligations</strong> — keeping records of payments for as
          long as tax law requires.
        </li>
      </ul>

      <h2>If you are a guest</h2>
      <p>
        You did not sign up to {BRAND_NAME}. A couple added you to their guest list, and
        that is how we came to hold your details.
      </p>

      <h3>What we hold about you</h3>
      <ul>
        <li>
          Your name, and whichever of your email address and phone number the couple has,
          so an invitation can reach you.
        </li>
        <li>
          Who you are attending with (your household), which events you are invited to,
          whether you are a child, and whether you have a plus-one.
        </li>
        <li>
          Your reply — attending or not, per event — and any message you leave for the
          couple.
        </li>
        <li>
          Your answers to the couple&rsquo;s questions, which often include{' '}
          <strong>meal choices and dietary requirements</strong>.
        </li>
      </ul>
      <OpenQuestion>
        <p>
          &ldquo;Vegetarian&rdquo; is a preference, but &ldquo;coeliac&rdquo; or a severe
          nut allergy is <strong>health data</strong>, which UK law protects more
          strictly — and the dietary box is free text, so we cannot control which one you
          type. How we ask for this, and on what basis, is under legal review, and the
          RSVP form will be changed if it needs to be.
        </p>
      </OpenQuestion>
      <p>
        We do not sell guest data, use it for advertising, or use it to contact you about
        anything other than the wedding you were invited to. We never contact you on our
        own behalf.
      </p>

      <h3>How your invitation link works</h3>
      <p>
        Your invitation contains a private link unique to your household. Anyone with
        that link can see your invitation and reply on your household&rsquo;s behalf, so
        treat it as you would a paper invitation — please don&rsquo;t post it publicly.
        When you open it we store a cookie so you don&rsquo;t have to find the link
        again; see the <Link href="/cookies">cookie notice</Link>.
      </p>

      <h3>Asking the couple, or asking us</h3>
      <p>
        The couple chose to invite you and controls your details, so the quickest route is
        usually to ask them directly — they can correct or remove you from their guest
        list themselves, at any time. If you would rather come to us, or they
        don&rsquo;t respond, write to{' '}
        <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a> and we will
        help.
      </p>

      <h2>Who else sees your data</h2>
      <p>
        We use other companies to run parts of the service. They may only act on our
        instructions. We do not sell personal data to anyone, and there is no
        advertising network involved at any point.
      </p>
      <TableWrap>
        <table>
          <thead>
            <tr>
              <th>Provider</th>
              <th>What it does</th>
              <th>What it sees</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Supabase</td>
              <td>Database, sign-in, file storage</td>
              <td>Everything stored in the app</td>
            </tr>
            <tr>
              <td>Vercel</td>
              <td>Hosting and delivery</td>
              <td>Traffic and technical logs, including IP addresses</td>
            </tr>
            <tr>
              <td>Stripe</td>
              <td>Payments</td>
              <td>The couple&rsquo;s billing details. Card data goes to Stripe directly, never to us</td>
            </tr>
            <tr>
              <td>Resend</td>
              <td>Sending email invitations and reminders</td>
              <td>Recipient name, email address, message content</td>
            </tr>
            <tr>
              <td>Twilio</td>
              <td>Sending SMS and WhatsApp invitations</td>
              <td>Recipient phone number and message content</td>
            </tr>
            <tr>
              <td>PostHog (EU)</td>
              <td>Product analytics</td>
              <td>Account or site identifiers only, no names. Sent from our server, so it sets no cookies in your browser</td>
            </tr>
            <tr>
              <td>Anthropic</td>
              <td>Optional AI help — drafting wording, reading a pasted guest list</td>
              <td>Only the text you submit to that feature. Not used to train their models</td>
            </tr>
            <tr>
              <td>Unsplash, Openverse</td>
              <td>Stock photo search</td>
              <td>Your search terms. Chosen photos are copied to our storage, not linked from theirs</td>
            </tr>
          </tbody>
        </table>
      </TableWrap>
      <p>
        Some of these are outside the UK. Where that is the case, transfers rely on the
        UK&rsquo;s approved safeguards — an adequacy decision, or the International Data
        Transfer Agreement or Addendum. Analytics are hosted in the EU specifically so
        that data stays in Europe.
      </p>
      <p>
        Links out to Google Maps or a calendar app are ordinary links. Nothing is sent to
        those services unless you click, at which point their own privacy policy applies.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>
          <strong>A published wedding site is hosted for 18 months</strong> from the day
          it is first published. After it expires the site stops being publicly visible.
        </li>
        <li>
          <strong>Deleting something in the app hides it immediately</strong> but keeps a
          copy for a short period, so that an accident can be undone.
        </li>
        <li>
          <strong>Each time a site is published we keep a snapshot</strong> of that
          version, so the couple can see what was live and when.
        </li>
        <li>
          <strong>Payment records</strong> are kept for as long as tax and accounting law
          requires — currently six years.
        </li>
        <li>
          <strong>Closing an account</strong> deletes the account, its sites and its
          guest lists. Tell us and we will confirm when it is done.
        </li>
      </ul>

      <h2 id="rights">Your rights</h2>
      <p>Under UK data protection law you can ask us to:</p>
      <ul>
        <li>give you a copy of what we hold about you;</li>
        <li>correct it if it is wrong;</li>
        <li>delete it;</li>
        <li>stop or limit how we use it, including objecting to our legitimate interests;</li>
        <li>send it to you, or to another service, in a portable format.</li>
      </ul>
      <p>
        Email <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>. We
        will reply within one month. There is no charge.
      </p>
      <p>
        If we get it wrong you can complain to the Information Commissioner&rsquo;s
        Office at <a href="https://ico.org.uk/make-a-complaint/">ico.org.uk</a> or on
        0303 123 1113. We would rather you told us first, but you do not have to.
      </p>

      <h2>Children</h2>
      <p>
        {BRAND_NAME}{' '}
        is for adults planning a wedding. Children appear on guest lists —
        we hold a name, an attendance status and sometimes a meal choice, entered by the
        couple or by the child&rsquo;s household, and nothing more. We do not create
        accounts for or market to children.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit and at rest. Each couple&rsquo;s data is isolated at
        the database level, so one account cannot read another&rsquo;s — this is enforced
        by the database itself rather than by application code, and is tested
        automatically. Access to production data is limited to those who need it. No
        service can promise perfect security, but if a breach affects you we will tell
        you and the ICO within the time the law allows.
      </p>

      <h2>Changes</h2>
      <p>
        If we change how we use data in a way that affects you, we will email couples with
        an active site rather than quietly editing this page. The date at the bottom
        always reflects the current version.
      </p>
    </>
  )
}
