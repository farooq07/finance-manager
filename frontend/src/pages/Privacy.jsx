import LegalPageShell from '../components/LegalPageShell';

export default function Privacy() {
  return (
    <LegalPageShell title="Privacy Policy" lastUpdated="20 May 2026">
      <p>
        This Privacy Policy explains how <strong>FSWealth Axis</strong> ("we", "us", or "the Service") collects,
        uses, stores, and protects your information when you use our personal finance management application.
        We are based in Karachi, Pakistan, and operate under the laws of the Islamic Republic of Pakistan,
        including the Prevention of Electronic Crimes Act 2016 (PECA) and the draft Personal Data Protection Bill.
      </p>

      <p className="text-xs italic">
        This document is a working draft. Before public launch, have it reviewed by a Pakistan-qualified
        data-protection lawyer to ensure it accurately reflects your processing practices.
      </p>

      <h2>1. Information We Collect</h2>
      <h3>Account information</h3>
      <ul>
        <li>Email address, name, and password hash (passwords are never stored in plain text)</li>
        <li>One-time passcodes (OTPs) for email verification</li>
        <li>Optional 6-digit application PIN, stored encrypted at rest</li>
      </ul>

      <h3>Financial information you provide</h3>
      <ul>
        <li>Bank and digital wallet account names, balances, account numbers, IBANs, and currency</li>
        <li>Transaction data you upload (CSV/PDF statements) or enter manually</li>
        <li>Investment holdings (mutual funds, PSX stocks), expense records, dues, rent entries, and physical asset records</li>
        <li>Beneficiary names and account details you save</li>
      </ul>

      <h3>Automatically collected</h3>
      <ul>
        <li>Login timestamps, IP address, and basic device information for security purposes</li>
        <li>Application usage events for service stability and bug diagnosis</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To provide and operate the Service — display your data, run AI categorisation, generate insights</li>
        <li>To authenticate you and protect your account (JWT tokens, OTP delivery, PIN gating)</li>
        <li>To send you transactional emails (verification, weekly summaries, bill reminders)</li>
        <li>To improve the Service through aggregate, de-identified analytics</li>
        <li>To comply with applicable laws and respond to lawful requests from authorities</li>
      </ul>

      <h2>3. AI Processing</h2>
      <p>
        The Service uses third-party AI providers (Google Gemini and Groq) to automatically categorise
        transaction descriptions and to answer your queries in the in-app assistant. When this happens:
      </p>
      <ul>
        <li>Only transaction descriptions and (for the assistant) the messages you send are transmitted</li>
        <li>Your account identifiers, account numbers, and IBANs are <strong>never</strong> sent to AI providers</li>
        <li>Provider responses are cached locally to avoid repeated transmission</li>
        <li>You can disable AI categorisation in Settings</li>
      </ul>

      <h2>4. How We Store and Protect Your Data</h2>
      <ul>
        <li>Data is stored in Supabase PostgreSQL with row-level isolation by user</li>
        <li>All traffic between your device and our servers is encrypted in transit (TLS 1.2+)</li>
        <li>Sensitive secrets (API keys, PIN, OAuth tokens) are encrypted at rest using AES-256-GCM</li>
        <li>Backups are encrypted and retained for 30 days</li>
        <li>Access to production data is restricted to authorised engineers and logged</li>
      </ul>

      <h2>5. Sharing & Disclosure</h2>
      <p>We do <strong>not</strong> sell your data. We share information only:</p>
      <ul>
        <li>With infrastructure providers strictly necessary to operate the Service (Supabase, Railway, Vercel, Gmail SMTP, Google Gemini, Groq)</li>
        <li>When required by Pakistani law, court order, or to protect against fraud or abuse</li>
        <li>With your explicit consent, for any other purpose</li>
      </ul>

      <h2>6. Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li><strong>Access</strong> — export all your data at any time via Settings → Export Data</li>
        <li><strong>Correct</strong> — edit or update any record you have created</li>
        <li><strong>Delete</strong> — request permanent deletion of your account and all associated data</li>
        <li><strong>Withdraw consent</strong> — turn off optional features (AI categorisation, email summaries)</li>
        <li><strong>Complain</strong> — to the appropriate Pakistani data-protection authority once the PDP Bill is enacted</li>
      </ul>

      <h2>7. Retention</h2>
      <p>
        We retain your account and financial data for as long as your account is active. If you delete your
        account, all personally identifiable data is permanently removed within 30 days, except where we are
        legally required to retain it (tax, financial-services regulations).
      </p>

      <h2>8. Children</h2>
      <p>
        The Service is not intended for users under 18 years of age. We do not knowingly collect data from
        minors. If you believe a minor has created an account, please contact us.
      </p>

      <h2>9. International Transfers</h2>
      <p>
        Our infrastructure providers (Supabase, Railway, Vercel) may store data in regions outside Pakistan.
        By using the Service you consent to this transfer. We select providers with industry-standard security
        certifications.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this policy. Material changes will be communicated by email and require fresh acceptance
        before continued use of the Service.
      </p>

      <h2>11. Contact</h2>
      <p>
        For privacy questions or to exercise any right above, email <a href="mailto:privacy@fswealthaxis.com">privacy@fswealthaxis.com</a>.
      </p>
    </LegalPageShell>
  );
}
