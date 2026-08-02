import type { Metadata } from 'next'
import Link from 'next/link'
import { BRAND_NAME } from '@/lib/brand'
import { LEGAL_CONTACT_EMAIL } from '@/lib/legal'
import { TableWrap } from '../_parts'

export const metadata: Metadata = {
  title: `Cookies — ${BRAND_NAME}`,
  description: `The four cookies ${BRAND_NAME} uses, and why there is no cookie banner.`,
}

export default function CookiesPage() {
  return (
    <>
      <h1>Cookies</h1>
      <p>
        {BRAND_NAME} sets a small number of cookies, all of them necessary to make the
        site work. There are no advertising cookies, no tracking pixels, and no
        third-party scripts running in your browser.
      </p>

      <h2>Why there is no cookie banner</h2>
      <p>
        UK law requires consent for cookies that aren&rsquo;t strictly necessary — the
        ones used for advertising, or for watching what you do across different sites.
        We don&rsquo;t use any. The cookies below exist only to keep you signed in and to
        remember which invitation is yours, so asking permission for them would be a
        banner that couldn&rsquo;t take no for an answer.
      </p>
      <p>
        We do measure a handful of product events — that a site was created, published or
        unlocked. That measurement happens on our server, not in your browser, so it
        involves no cookie and no tracking of you across the web. It is described in the{' '}
        <Link href="/privacy">privacy notice</Link>, and you can object to it.
      </p>

      <h2>What we set</h2>
      <TableWrap>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Purpose</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>milestones_guest</td>
              <td>
                Remembers which invitation you opened, so you can come back to a wedding
                site and reply without hunting for the original link. It holds a reference
                to your household and is signed so it cannot be altered or forged
              </td>
              <td>180 days</td>
            </tr>
            <tr>
              <td>sb-&hellip;-auth-token</td>
              <td>
                Keeps a couple signed in to their account. Set by our authentication
                provider. Without it you would have to sign in on every page
              </td>
              <td>Until sign-out</td>
            </tr>
          </tbody>
        </table>
      </TableWrap>
      <p>
        Both are <strong>HttpOnly</strong> — JavaScript on the page cannot read them —
        and both are sent only over an encrypted connection. Neither can identify you on
        any other website.
      </p>

      <h2>Not a cookie, but worth mentioning</h2>
      <p>
        We store your light or dark theme choice in your browser&rsquo;s local storage. It
        never leaves your device and is never sent to us. Clearing your browser data
        resets it.
      </p>

      <h2>Turning them off</h2>
      <p>
        Every browser lets you block or delete cookies in its settings. Blocking ours
        won&rsquo;t break a wedding site — you will just be asked for your invitation link
        again each visit, and couples won&rsquo;t be able to stay signed in.
      </p>
      <p>
        Questions: <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>
    </>
  )
}
