import { useState } from 'react';
import { Link } from 'react-router-dom';

const tiers = [
  {
    name: 'Developer',
    id: 'free',
    priceMonthly: '$0',
    priceYearly: '$0',
    description: 'Perfect for testing and small projects.',
    features: [
      { text: '100 documents / month', included: true },
      { text: '1,000 verifications / month', included: true },
      { text: '1 team member', included: true },
      { text: 'API access', included: true },
      { text: 'Community support', included: true },
      { text: '3-month default expiry', included: true },
      { text: 'Bulk operations', included: false },
      { text: 'Webhooks', included: false },
      { text: 'Priority support', included: false },
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Business',
    id: 'pro',
    priceMonthly: '$99',
    priceYearly: '$999',
    description: 'For growing orgs with regular verification needs.',
    features: [
      { text: '1,000 documents / month', included: true },
      { text: '10,000 verifications / month', included: true },
      { text: '5 team members', included: true },
      { text: 'API access', included: true },
      { text: 'Email support (24h)', included: true },
      { text: 'Bulk operations', included: true },
      { text: 'Webhooks', included: true },
      { text: 'Basic analytics', included: true },
      { text: 'IP whitelisting', included: false },
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    id: 'enterprise',
    priceMonthly: '$499',
    priceYearly: '$4,999',
    description: 'For large organisations with high-volume requirements.',
    features: [
      { text: '10,000 documents / month', included: true },
      { text: '100,000 verifications / month', included: true },
      { text: '20 team members', included: true },
      { text: 'Priority support (4h)', included: true },
      { text: 'Bulk operations', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'IP whitelisting', included: true },
      { text: 'Audit logs', included: true },
      { text: 'SSO integration', included: true },
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

const faqs = [
  {
    q: 'What happens if I exceed my limits?',
    a: 'We notify you at 80% and 95%. You can upgrade or pay $0.05/document and $0.005/verification for overages.',
  },
  {
    q: 'Can I switch plans?',
    a: 'Yes — upgrade or downgrade any time. Changes are prorated and applied immediately.',
  },
  {
    q: 'What payment methods are accepted?',
    a: 'Cards, bank transfers, Paystack (Nigeria), M-Pesa (Kenya), and SnapScan (South Africa).',
  },
  {
    q: 'Is there a free trial?',
    a: 'The Developer plan is always free. Business and Enterprise plans include a 14-day free trial.',
  },
];

export default function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <div className="pricing-page animate-fade-in">
      {/* Header */}
      <header className="pricing-header">
        <a href="/" className="pricing-back">← Back</a>
        <h1 className="pricing-title">Simple, transparent pricing</h1>
        <p className="pricing-subtitle">
          Choose the plan that fits your organisation. All plans include core document fingerprinting.
        </p>

        {/* Toggle */}
        <div className="pricing-toggle">
          <button
            className={`pricing-toggle-btn ${!annual ? 'active' : ''}`}
            onClick={() => setAnnual(false)}
          >
            Monthly
          </button>
          <button
            className={`pricing-toggle-btn ${annual ? 'active' : ''}`}
            onClick={() => setAnnual(true)}
          >
            Yearly <span className="pricing-save">Save 16%</span>
          </button>
        </div>
      </header>

      {/* Cards */}
      <div className="pricing-grid">
        {tiers.map((tier) => (
          <div key={tier.id} className={`pricing-card ${tier.highlighted ? 'pricing-card-highlight' : ''}`}>
            {tier.highlighted && <div className="pricing-badge">Most Popular</div>}
            <h2 className="pricing-card-name">{tier.name}</h2>
            <p className="pricing-card-desc">{tier.description}</p>

            <div className="pricing-card-price">
              <span className="pricing-amount">{annual ? tier.priceYearly : tier.priceMonthly}</span>
              <span className="pricing-period">/{annual ? 'year' : 'month'}</span>
            </div>

            <Link to="/apply" className={`btn ${tier.highlighted ? 'btn-primary' : 'btn-secondary'} pricing-cta text-center flex items-center justify-center`}>
              {tier.cta}
            </Link>

            <ul className="pricing-features">
              {tier.features.map((f) => (
                <li key={f.text} className={`pricing-feature ${f.included ? '' : 'pricing-feature-disabled'}`}>
                  {f.included ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                      <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                    </svg>
                  )}
                  {f.text}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <section className="pricing-faq">
        <h2 className="pricing-faq-title">Frequently Asked Questions</h2>
        <div className="pricing-faq-grid">
          {faqs.map((faq) => (
            <div key={faq.q} className="pricing-faq-item">
              <h3>{faq.q}</h3>
              <p>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        .pricing-page {
          min-height: 100vh;
          background: var(--color-bg-primary);
          padding: var(--space-8) var(--space-6);
          max-width: 1100px;
          margin: 0 auto;
        }
        .pricing-back {
          color: var(--color-text-muted);
          font-size: var(--text-sm);
          text-decoration: none;
          transition: color var(--transition-fast);
        }
        .pricing-back:hover { color: var(--color-text-primary); }
        .pricing-header {
          text-align: center;
          margin-bottom: var(--space-10);
        }
        .pricing-title {
          font-size: 2.25rem;
          font-weight: 800;
          background: var(--gradient-accent);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: var(--space-4) 0 var(--space-2);
        }
        .pricing-subtitle {
          color: var(--color-text-secondary);
          font-size: var(--text-lg);
          max-width: 520px;
          margin: 0 auto var(--space-6);
        }
        .pricing-toggle {
          display: inline-flex;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-full);
          padding: 4px;
        }
        .pricing-toggle-btn {
          padding: var(--space-2) var(--space-5);
          border-radius: var(--radius-full);
          border: none;
          background: none;
          color: var(--color-text-muted);
          font-size: var(--text-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }
        .pricing-toggle-btn.active {
          background: var(--color-bg-primary);
          color: var(--color-text-primary);
          box-shadow: var(--shadow-sm);
        }
        .pricing-save {
          color: var(--color-accent);
          font-size: var(--text-xs);
          margin-left: 4px;
        }

        /* Grid */
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-5);
          margin-bottom: var(--space-12);
        }
        @media (max-width: 768px) {
          .pricing-grid { grid-template-columns: 1fr; }
        }

        /* Card */
        .pricing-card {
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: var(--space-6);
          position: relative;
          transition: transform var(--transition-normal), box-shadow var(--transition-normal);
        }
        .pricing-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-lg);
        }
        .pricing-card-highlight {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 1px var(--color-accent), var(--shadow-md);
        }
        .pricing-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--gradient-accent);
          color: white;
          font-size: var(--text-xs);
          font-weight: 700;
          padding: 4px 16px;
          border-radius: var(--radius-full);
        }
        .pricing-card-name {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: var(--space-1);
        }
        .pricing-card-desc {
          font-size: var(--text-sm);
          color: var(--color-text-muted);
          margin-bottom: var(--space-5);
        }
        .pricing-card-price {
          margin-bottom: var(--space-5);
        }
        .pricing-amount {
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--color-text-primary);
        }
        .pricing-period {
          font-size: var(--text-sm);
          color: var(--color-text-muted);
        }
        .pricing-cta {
          width: 100%;
          margin-bottom: var(--space-6);
        }

        /* Features */
        .pricing-features {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }
        .pricing-feature {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
        }
        .pricing-feature-disabled {
          color: var(--color-text-muted);
          opacity: 0.5;
        }

        /* FAQ */
        .pricing-faq {
          border-top: 1px solid var(--color-border);
          padding-top: var(--space-10);
        }
        .pricing-faq-title {
          text-align: center;
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: var(--space-8);
        }
        .pricing-faq-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-6);
        }
        @media (max-width: 768px) {
          .pricing-faq-grid { grid-template-columns: 1fr; }
        }
        .pricing-faq-item h3 {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--color-text-primary);
          margin-bottom: var(--space-2);
        }
        .pricing-faq-item p {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          line-height: 1.6;
        }
      `}</style>
    </div>
  );
}
