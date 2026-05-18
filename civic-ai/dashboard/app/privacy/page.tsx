import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | CIVIC AI",
  description: "CIVIC AI privacy policy — DPDP Act 2023 compliant.",
};

const DATA_PROCESSED = [
  { data: "Vote fingerprint",     what: "SHA-256 hash of IP + browser user-agent (not reversible)",                                  purpose: "Prevent duplicate votes",               basis: "Legitimate interest (platform integrity)" },
  { data: "Feedback email",       what: "Email you voluntarily enter in the feedback form",                                           purpose: "Respond to your feedback",              basis: "Your consent" },
  { data: "Supporter info",       what: "Name, email, contribution amount, optional social handle",                                   purpose: "Process contributions, display if opted in", basis: "Contractual necessity + consent" },
  { data: "Payment details",      what: "Card, UPI, bank details — processed entirely by Razorpay. We never see or store these.",     purpose: "Complete your contribution",            basis: "Contractual necessity" },
  { data: "Server logs",          what: "IP address, browser type, request URL, timestamp",                                           purpose: "Security, abuse prevention, debugging", basis: "Legitimate interest" },
  { data: "Error logs (Sentry)",  what: "Stack traces, browser type, URL. No personal identifiers captured.",                         purpose: "Fix bugs",                              basis: "Legitimate interest" },
  { data: "Analytics (Plausible)",what: "Aggregated page views, referrer country. No cookies, no personal identifiers.",              purpose: "Understand which modules are useful",   basis: "Legitimate interest" },
];

const RETENTION = [
  { data: "Feedback",              how: "12 months from submission",                                   why: "Support and follow-up, then deleted" },
  { data: "Vote fingerprints",     how: "Max 24 months",                                               why: "Prevent duplicate voting" },
  { data: "Supporter data",        how: "7 years minimum",                                             why: "Indian Income Tax Act requirement" },
  { data: "Server logs",           how: "30 days",                                                     why: "Vercel platform default" },
  { data: "Error logs (Sentry)",   how: "90 days",                                                     why: "Debugging" },
  { data: "Analytics (Plausible)", how: "Aggregated indefinitely; individual visit data not retained", why: "Analysis is stateless" },
];

const TRANSFERS = [
  { processor: "Vercel",    purpose: "Hosting",        location: "Global edge + US origin" },
  { processor: "Razorpay",  purpose: "Payments",       location: "India" },
  { processor: "Neon",      purpose: "Database",       location: "Asia (configurable)" },
  { processor: "Upstash",   purpose: "Cache",          location: "Global (AWS regions)" },
  { processor: "Plausible", purpose: "Analytics",      location: "EU (Germany)" },
  { processor: "Resend",    purpose: "Admin email",    location: "US" },
  { processor: "Sentry",    purpose: "Error logs",     location: "US" },
];

const THIRD_PARTY = [
  { service: "Vercel",    purpose: "Hosting & deployment",          policy: "vercel.com/legal/privacy-policy" },
  { service: "Razorpay",  purpose: "Payment processing",            policy: "razorpay.com/privacy" },
  { service: "Neon",      purpose: "Managed PostgreSQL database",   policy: "neon.tech/privacy-policy" },
  { service: "Upstash",   purpose: "Redis cache",                   policy: "upstash.com/trust/privacy.pdf" },
  { service: "Plausible", purpose: "Analytics (no personal data)",  policy: "plausible.io/data-policy" },
  { service: "Resend",    purpose: "Admin emails only",             policy: "resend.com/legal/privacy-policy" },
  { service: "Sentry",    purpose: "Error logs (no personal data)", policy: "sentry.io/privacy" },
];

export default function PrivacyPage() {
  return (
    <main
      className="min-h-screen"
      style={{ background: "#0c0c0c", fontFamily: "Almarai, system-ui, sans-serif" }}
    >
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-2">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors">
          ← Back to CIVIC AI
        </Link>
      </div>

      <section className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-extrabold mb-1" style={{ color: "#E1E0CC" }}>Privacy Policy</h1>
        <p className="text-sm" style={{ color: "rgba(225,224,204,0.38)" }}>
          Last updated: May 2026 &nbsp;·&nbsp; DPDP Act 2023 compliant
        </p>
      </section>

      <div className="max-w-3xl mx-auto px-6 pb-24 space-y-8">

        <Sec n="1" title="About This Policy">
          <p>
            CIVIC AI is an independent citizen transparency platform based in Bengaluru,
            Karnataka, India. This Privacy Policy explains how we collect, process, and protect your
            personal data, in compliance with the{" "}
            <strong style={{ color: "#E1E0CC" }}>Digital Personal Data Protection (DPDP) Act, 2023</strong>.
          </p>
          <ul className="mt-3 space-y-1 text-[13px]">
            <li><strong style={{ color: "rgba(225,224,204,0.75)" }}>Operator:</strong> CIVIC AI, Bengaluru, Karnataka, India</li>
            <li><strong style={{ color: "rgba(225,224,204,0.75)" }}>Contact:</strong> support@civic-ai.in</li>
          </ul>
        </Sec>

        <Sec n="2" title="What Data We Process">
          <div className="overflow-x-auto -mx-2 mt-2">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <Th>Data</Th><Th>What Exactly</Th><Th>Purpose</Th><Th>Legal Basis (DPDP)</Th>
                </tr>
              </thead>
              <tbody>
                {DATA_PROCESSED.map((r) => (
                  <tr key={r.data} className="align-top" style={{ borderTop: "1px solid rgba(222,219,200,0.07)" }}>
                    <Td className="font-semibold" style={{ color: "rgba(225,224,204,0.8)" }}>{r.data}</Td>
                    <Td>{r.what}</Td>
                    <Td>{r.purpose}</Td>
                    <Td>{r.basis}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Sec>

        <Sec n="3" title="What We Do NOT Collect">
          <ul className="space-y-1.5 text-[13px]">
            {[
              "Aadhaar, PAN, voter ID, driving licence, or any government-issued ID",
              "Personal data of citizens from government portals — only aggregated/statistical data",
              "Cookies — zero cookies of any kind on this platform",
              "Tracking pixels or third-party advertising trackers",
              "Location data (GPS or precise geolocation)",
              "Biometric data",
              "Financial account numbers or credit card details",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-red-400 font-bold flex-shrink-0">✗</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px] font-semibold" style={{ color: "rgba(225,224,204,0.75)" }}>
            We do NOT sell, rent, license, or share your data with advertisers or data brokers.
          </p>
        </Sec>

        <Sec n="4" title="Data Retention">
          <div className="overflow-x-auto -mx-2 mt-2">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <Th>Data</Th><Th>How Long</Th><Th>Why</Th>
                </tr>
              </thead>
              <tbody>
                {RETENTION.map((r) => (
                  <tr key={r.data} className="align-top" style={{ borderTop: "1px solid rgba(222,219,200,0.07)" }}>
                    <Td className="font-semibold" style={{ color: "rgba(225,224,204,0.8)" }}>{r.data}</Td>
                    <Td>{r.how}</Td>
                    <Td>{r.why}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Sec>

        <Sec n="5" title="Your Rights Under DPDP Act, 2023">
          <ul className="space-y-2 text-[13px]">
            {[
              ["Right to Access",           "Request a copy of what we hold about you"],
              ["Right to Correction",       "Request correction of inaccurate data"],
              ["Right to Erasure",          "Request deletion of your data (subject to legal retention requirements)"],
              ["Right to Withdraw Consent", "Withdraw previously given consent at any time"],
              ["Right to Grievance Redressal", "Raise concerns and receive a response within 30 days"],
              ["Right to Nominate",         "Nominate another individual to exercise these rights on your behalf"],
            ].map(([right, desc]) => (
              <li key={right} className="flex gap-2">
                <span className="font-semibold min-w-[11rem] flex-shrink-0" style={{ color: "rgba(225,224,204,0.75)" }}>{right}:</span>
                <span>{desc}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[13px]">
            Email <strong style={{ color: "rgba(225,224,204,0.75)" }}>support@civic-ai.in</strong> with
            subject <em>&quot;DPDP Data Request&quot;</em>. We respond within 30 days.
          </p>
        </Sec>

        <Sec n="6" title="Grievance Officer">
          <ul className="text-[13px] space-y-1.5">
            <li><strong style={{ color: "rgba(225,224,204,0.75)" }}>Name:</strong> CIVIC AI Team</li>
            <li><strong style={{ color: "rgba(225,224,204,0.75)" }}>Role:</strong> Data Fiduciary Contact</li>
            <li><strong style={{ color: "rgba(225,224,204,0.75)" }}>Email:</strong> support@civic-ai.in</li>
            <li><strong style={{ color: "rgba(225,224,204,0.75)" }}>Response time:</strong> Within 30 days of receipt</li>
          </ul>
        </Sec>

        <Sec n="7" title="Children's Data">
          <p className="text-[13px]">
            CIVIC AI is not directed at children under 18. We do not knowingly collect personal data
            from minors. If you believe a child has submitted personal data, contact{" "}
            <strong style={{ color: "rgba(225,224,204,0.75)" }}>support@civic-ai.in</strong>{" "}
            and we will delete it within 72 hours.
          </p>
        </Sec>

        <Sec n="8" title="Cross-Border Data Transfers">
          <div className="overflow-x-auto -mx-2 mt-2">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <Th>Processor</Th><Th>Purpose</Th><Th>Data Location</Th>
                </tr>
              </thead>
              <tbody>
                {TRANSFERS.map((r) => (
                  <tr key={r.processor} className="align-top" style={{ borderTop: "1px solid rgba(222,219,200,0.07)" }}>
                    <Td className="font-semibold" style={{ color: "rgba(225,224,204,0.8)" }}>{r.processor}</Td>
                    <Td>{r.purpose}</Td>
                    <Td>{r.location}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Sec>

        <Sec n="9" title="Automated Decision-Making and AI Processing">
          <p className="text-[13px]">
            We use automated systems for news classification, AI insights, and data confidence
            scoring. These do not make decisions with legal or significant effects on you. If you
            believe an AI summary is incorrect, please{" "}
            <Link href="/feedback" style={{ color: "rgba(96,165,250,0.85)" }} className="underline">
              report it via feedback
            </Link>
            .
          </p>
        </Sec>

        <Sec n="10" title="Data Security">
          <ul className="space-y-1.5 text-[13px] list-disc ml-5">
            <li>AES-256 encryption for sensitive data at rest</li>
            <li>TLS 1.2+ (HTTPS) for all data in transit</li>
            <li>Two-factor authentication (TOTP) on the admin panel</li>
            <li>HMAC-SHA256 payment signature verification</li>
            <li>No plaintext passwords anywhere in our systems</li>
          </ul>
        </Sec>

        <Sec n="11" title="Data Breach Notification">
          <p className="text-[13px]">
            In the event of a personal data breach, we will notify affected users within{" "}
            <strong style={{ color: "rgba(225,224,204,0.75)" }}>72 hours</strong> of becoming aware,
            as required under DPDP Act 2023. We will also notify the Data Protection Board of India.
          </p>
        </Sec>

        <Sec n="12" title="Third-Party Services">
          <div className="overflow-x-auto -mx-2 mt-2">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <Th>Service</Th><Th>Purpose</Th><Th>Privacy Policy</Th>
                </tr>
              </thead>
              <tbody>
                {THIRD_PARTY.map((r) => (
                  <tr key={r.service} className="align-top" style={{ borderTop: "1px solid rgba(222,219,200,0.07)" }}>
                    <Td className="font-semibold" style={{ color: "rgba(225,224,204,0.8)" }}>{r.service}</Td>
                    <Td>{r.purpose}</Td>
                    <Td>
                      <a
                        href={"https://" + r.policy}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all underline"
                        style={{ color: "rgba(96,165,250,0.8)" }}
                      >
                        {r.policy}
                      </a>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Sec>

        <Sec n="13" title="Updates to This Policy">
          <p className="text-[13px]">
            We may update this Privacy Policy as our data practices or applicable laws change.
            Material changes will be highlighted with an updated &quot;Last updated&quot; date.
          </p>
        </Sec>

        {/* Footer */}
        <div
          className="flex items-center justify-center gap-5 text-sm pt-4"
          style={{ borderTop: "1px solid rgba(222,219,200,0.08)", color: "rgba(225,224,204,0.35)" }}
        >
          <Link href="/about"    className="hover:text-[rgba(225,224,204,0.7)] transition-colors">About</Link>
          <span>·</span>
          <Link href="/feedback" className="hover:text-[rgba(225,224,204,0.7)] transition-colors">Feedback</Link>
          <span>·</span>
          <Link href="/"         className="hover:text-[rgba(225,224,204,0.7)] transition-colors">Back to App</Link>
        </div>
      </div>
    </main>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function Sec({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-2xl p-7 border"
      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(222,219,200,0.12)" }}
    >
      <h2 className="text-base font-bold mb-3" style={{ color: "#E1E0CC" }}>
        {n}. {title}
      </h2>
      <div className="text-[13px] leading-relaxed" style={{ color: "rgba(225,224,204,0.55)" }}>
        {children}
      </div>
    </section>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      className="text-left p-2.5 font-semibold text-[11px]"
      style={{ background: "rgba(255,255,255,0.04)", color: "rgba(225,224,204,0.6)", borderBottom: "1px solid rgba(222,219,200,0.1)" }}
    >
      {children}
    </th>
  );
}

function Td({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <td
      className={"p-2.5 align-top " + className}
      style={{ color: "rgba(225,224,204,0.5)", borderBottom: "1px solid rgba(222,219,200,0.06)", ...style }}
    >
      {children}
    </td>
  );
}
