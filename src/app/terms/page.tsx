export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  const lastUpdated = "March 2026";
  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-slate-400 mb-8">Last updated: {lastUpdated}</p>

      <div className="space-y-6 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">1. Acceptance</h2>
          <p>By using Recipe Factory (&quot;the Service&quot;), you agree to these terms. If you do not agree, stop using the Service immediately.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">2. Description of Service</h2>
          <p>Recipe Factory is a SaaS tool that uses AI to generate recipe content and deploys recipe websites to Vercel. You are responsible for the content published on sites you deploy.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">3. Acceptable Use</h2>
          <p>You agree not to use the Service to generate spam, misleading content, or material that violates applicable law. Abuse of AI generation (e.g., running bots to circumvent quotas) will result in account termination.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">4. Billing</h2>
          <p>Subscriptions are billed monthly via Stripe. You may cancel at any time from your billing settings. No refunds are issued for partial months.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">5. Intellectual Property</h2>
          <p>AI-generated recipe content is owned by you, the subscriber. Recipe Factory retains no rights to your generated content. You own your deployed sites.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">6. Limitation of Liability</h2>
          <p>The Service is provided &quot;as is&quot;. Recipe Factory is not liable for any indirect, incidental, or consequential damages arising from use of the Service.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">7. Changes</h2>
          <p>We may update these terms with 14 days&apos; notice via email. Continued use after notice constitutes acceptance.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-slate-900 mb-2">8. Contact</h2>
          <p>Questions? Email us at support@recipefactory.app.</p>
        </section>
      </div>
    </div>
  );
}
