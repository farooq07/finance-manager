import LegalPageShell from '../components/LegalPageShell';

export default function Terms() {
  return (
    <LegalPageShell title="Terms of Service" lastUpdated="20 May 2026">
      <p>
        These Terms of Service ("Terms") govern your access to and use of <strong>FSWealth Axis</strong>
        ("the Service", "we", "us"). By creating an account or using the Service you agree to these Terms.
        If you do not agree, do not use the Service.
      </p>

      <p className="text-xs italic">
        This document is a working draft. Before public launch, have it reviewed by a Pakistan-qualified
        lawyer to ensure enforceability and accuracy under Pakistani contract and consumer law.
      </p>

      <h2>1. Eligibility</h2>
      <p>
        You must be at least 18 years of age and legally able to enter into a binding contract under the laws
        of Pakistan to use the Service.
      </p>

      <h2>2. The Service</h2>
      <p>
        FSWealth Axis is a personal finance management tool. It helps you record, categorise, and visualise
        your own financial data. It is <strong>not</strong> a bank, broker, payment processor, investment
        adviser, or financial institution. We do not move money, hold funds, execute trades, or provide
        regulated financial advice.
      </p>

      <h2>3. Accounts & Security</h2>
      <ul>
        <li>You are responsible for the accuracy of the information you provide</li>
        <li>You are responsible for keeping your password and app PIN confidential</li>
        <li>You must notify us immediately of any unauthorised use of your account</li>
        <li>We may suspend or terminate accounts that violate these Terms, are inactive for an extended period, or are used for unlawful purposes</li>
      </ul>

      <h2>4. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any unlawful purpose, including money laundering or tax evasion</li>
        <li>Upload data that does not belong to you or that you are not authorised to process</li>
        <li>Attempt to reverse-engineer, decompile, or extract source code from the Service</li>
        <li>Use automated tools (scrapers, bots) to access the Service outside the documented API</li>
        <li>Interfere with or disrupt the Service or its infrastructure</li>
        <li>Bypass rate limits, authentication, or access controls</li>
      </ul>

      <h2>5. Your Content</h2>
      <p>
        You retain ownership of all data you upload to or enter into the Service ("Your Content"). You grant
        us a limited, worldwide, royalty-free licence to host, process, transmit, and display Your Content
        solely for the purpose of operating the Service for you. This licence ends when you delete the
        content or close your account.
      </p>

      <h2>6. AI Features</h2>
      <p>
        The Service uses third-party AI models to categorise transactions and answer questions. AI output may
        be inaccurate or incomplete. You are responsible for verifying any categorisation, calculation, or
        recommendation before relying on it. The AI assistant is informational only and does not constitute
        financial, tax, or legal advice.
      </p>

      <h2>7. Subscription, Fees, and Refunds</h2>
      <p>
        Where the Service includes paid features, prices and billing terms will be displayed at the point of
        purchase. Unless otherwise stated, fees are non-refundable except where required by law. We may
        change pricing with at least 30 days' notice.
      </p>

      <h2>8. No Financial Advice</h2>
      <p>
        Nothing in the Service constitutes investment, tax, accounting, or legal advice. Stock prices,
        mutual-fund NAVs, Zakat calculations, currency rates, and other figures are provided for personal
        informational use only and may be delayed, incomplete, or inaccurate. Consult a qualified
        professional before making financial decisions.
      </p>

      <h2>9. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
        IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT DATA WILL
        BE COMPLETE OR ACCURATE.
      </p>

      <h2>10. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, FSWealth Axis and its operators will not be liable for any
        indirect, incidental, special, consequential, or punitive damages, or any loss of profits, revenue,
        data, or use, arising from your use of the Service. Our aggregate liability for any claim arising
        from the Service shall not exceed the fees you paid to us in the twelve months preceding the claim,
        or PKR 5,000, whichever is greater.
      </p>

      <h2>11. Termination</h2>
      <p>
        You may stop using the Service and delete your account at any time. We may suspend or terminate your
        access if you breach these Terms, or if we discontinue the Service (with reasonable notice).
      </p>

      <h2>12. Governing Law</h2>
      <p>
        These Terms are governed by the laws of the Islamic Republic of Pakistan. Any dispute arising from
        these Terms or the Service shall be subject to the exclusive jurisdiction of the courts of Lahore,
        Sindh.
      </p>

      <h2>13. Changes</h2>
      <p>
        We may update these Terms. Material changes will be communicated by email and require fresh
        acceptance before continued use.
      </p>

      <h2>14. Contact</h2>
      <p>
        For questions about these Terms, email <a href="mailto:legal@fswealthaxis.com">legal@fswealthaxis.com</a>.
      </p>
    </LegalPageShell>
  );
}
