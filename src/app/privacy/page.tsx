export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  const lastUpdated = "March 2026";
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

      <div className="space-y-6 text-sm leading-relaxed text-foreground">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Data We Collect</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Account data:</strong> email address, full name (provided at signup)</li>
            <li><strong>Usage data:</strong> projects created, recipes generated, deployment history</li>
            <li><strong>Billing data:</strong> managed by Stripe — we store only a Stripe customer ID, never raw card numbers</li>
            <li><strong>Log data:</strong> errors, generation requests (retained 30 days)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. How We Use Data</h2>
          <p>We use your data to operate the Service, send transactional emails (billing, quota alerts), and improve the product. We do not sell your data to third parties.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. Third-Party Services</h2>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Supabase</strong> — database and authentication</li>
            <li><strong>OpenAI</strong> — recipe content generation (keywords and prompts are sent to OpenAI)</li>
            <li><strong>Stripe</strong> — payment processing (PCI-compliant)</li>
            <li><strong>Vercel</strong> — hosting for deployed sites</li>
            <li><strong>Pexels</strong> — recipe images</li>
            <li><strong>Resend</strong> — transactional email</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. Data Retention</h2>
          <p>Account data is retained while your account is active. On deletion, your data is removed from our systems within 30 days. Stripe retains billing records per their policy.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">5. Your Rights</h2>
          <p>You may request a copy of your data or deletion of your account at any time by emailing support@recipefactory.app.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">6. Cookies</h2>
          <p>We use only session cookies for authentication (Supabase Auth). No tracking or advertising cookies.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">7. Contact</h2>
          <p>Privacy questions: support@recipefactory.app</p>
        </section>
      </div>
    </div>
  );
}
