import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About | CIVIC AI",
  description: "CIVIC AI — India's citizen transparency platform.",
};

/* ── Team ──────────────────────────────────────────────────────────────── */

const TEAM: { name: string; role: string; emoji: string; bio: string | null }[] = [
  { name: "Sai Kiran",   role: "Core Team", emoji: "🧑‍💻", bio: null },
  { name: "Sachitha",    role: "Core Team", emoji: "🧑‍💻", bio: null },
  { name: "Jai Chandra", role: "Core Team", emoji: "🧑‍💻", bio: null },
  { name: "Pavna Kumar", role: "Core Team", emoji: "🧑‍💻", bio: null },
];

/* ── Stats ─────────────────────────────────────────────────────────────── */

const STATS = [
  { value: "2026",  label: "Year launched" },
  { value: "780+",  label: "Districts planned" },
  { value: "29",    label: "Data modules / district" },
  { value: "Free",  label: "Cost to access" },
  { value: "NDSAP", label: "Legal data basis" },
  { value: "9",     label: "Live districts" },
];

/* ── Stand For ─────────────────────────────────────────────────────────── */

const STAND_FOR = [
  { icon: "📊", title: "Real Data, Not Opinions",     body: "Every number comes from a government portal, official API, or publicly available document. We never fabricate or estimate data." },
  { icon: "🌐", title: "Every District, Every State", body: "Currently live across Karnataka, Delhi, Maharashtra, West Bengal, Tamil Nadu, Telangana, and Uttar Pradesh — expanding to all 780+ districts across India." },
  { icon: "🌍", title: "Local Languages First",       body: "Data is presented in English and the regional language of each state — Kannada, Tamil, Telugu, Hindi, and more." },
  { icon: "⚡", title: "Live + Historical",            body: "Crop prices refresh every 15 minutes. Weather updates hourly. Budget data goes back years. Both matter." },
  { icon: "🔓", title: "Free Forever",                body: "No paywalls, no subscriptions. Government data belongs to citizens. We just make it accessible." },
  { icon: "🔍", title: "RTI Ready",                   body: "Don't see what you need? We provide ready-to-send RTI templates so you can get any government information by right." },
];

/* ── Sources ───────────────────────────────────────────────────────────── */

const SOURCES = [
  { name: "AGMARKNET",                    desc: "Agricultural Marketing Information Network — crop mandi prices" },
  { name: "India-WRIS",                   desc: "Water Resources Information System — dam and reservoir levels" },
  { name: "IMD",                          desc: "India Meteorological Department — rainfall and weather data" },
  { name: "Election Commission of India", desc: "Assembly and Lok Sabha election results and voter data" },
  { name: "eGramSwaraj / PFMS",           desc: "Panchayat + finance data (MGNREGA, district budgets)" },
  { name: "UDISE+",                       desc: "School enrollment, pass rates, student-teacher ratios" },
  { name: "National Scholarship Portal",  desc: "Government scholarship and scheme data" },
  { name: "PMAY-G / PMAY-U",             desc: "Pradhan Mantri Awas Yojana housing scheme data" },
];

/* ── Page ──────────────────────────────────────────────────────────────── */

export default function AboutPage() {
  return (
    <main
      className="min-h-screen"
      style={{ background: "#0c0c0c", fontFamily: "Almarai, system-ui, sans-serif" }}
    >
      {/* Back */}
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          ← Back to CIVIC AI
        </Link>
      </div>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 py-10 text-center">
        <div className="text-5xl mb-5">🏛️</div>
        <h1
          className="text-4xl font-extrabold mb-4 leading-tight tracking-tight"
          style={{ color: "#E1E0CC" }}
        >
          Your District.<br />Your Data.<br />Your Right.
        </h1>
        <p
          className="text-base max-w-2xl mx-auto leading-relaxed"
          style={{ color: "rgba(225,224,204,0.55)" }}
        >
          CIVIC AI is India&apos;s citizen transparency platform, launched in 2026. We aggregate
          district-level government data — budgets, crop prices, water levels, scheme coverage,
          infrastructure, and more — and present it in a clear, accessible interface for every Indian.
        </p>
        <p className="text-sm mt-3" style={{ color: "rgba(225,224,204,0.38)" }}>
          Currently covers{" "}
          <strong style={{ color: "rgba(225,224,204,0.75)" }}>9 districts</strong> across{" "}
          <strong style={{ color: "rgba(225,224,204,0.75)" }}>7 states</strong> — expanding to all{" "}
          <strong style={{ color: "rgba(225,224,204,0.75)" }}>780+ Indian districts</strong>.
        </p>
      </section>

      <div className="max-w-3xl mx-auto px-6 space-y-8 pb-24">

        {/* Mission */}
        <Card>
          <h2 className="text-xl font-bold mb-3" style={{ color: "#E1E0CC" }}>Our Mission</h2>
          <p className="leading-relaxed text-[15px]" style={{ color: "rgba(225,224,204,0.55)" }}>
            To make government data as easy to access as checking the weather — so that every citizen,
            journalist, researcher, and elected representative can engage with governance based on facts.
          </p>
        </Card>

        {/* The Team */}
        <Card>
          <h2 className="text-xl font-bold mb-6" style={{ color: "#E1E0CC" }}>The Team</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TEAM.map(({ name, role, emoji, bio }) => (
              <div
                key={name}
                className="rounded-xl p-4 border"
                style={{
                  background: bio ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)",
                  borderColor: "rgba(222,219,200,0.08)",
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{emoji}</span>
                  <div>
                    <div className="font-bold text-sm" style={{ color: "#E1E0CC" }}>{name}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: "rgba(225,224,204,0.4)" }}>
                      {role}
                    </div>
                  </div>
                </div>
                {bio && (
                  <p className="text-[13px] leading-relaxed" style={{ color: "rgba(225,224,204,0.5)" }}>
                    {bio}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Platform at a glance */}
        <section>
          <h2 className="text-xl font-bold mb-4" style={{ color: "#E1E0CC" }}>Platform at a glance</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {STATS.map(({ value, label }) => (
              <div
                key={label}
                className="rounded-xl p-5 border text-center"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(222,219,200,0.1)" }}
              >
                <div className="text-2xl font-extrabold" style={{ color: "#E1E0CC" }}>{value}</div>
                <div className="text-[12px] mt-1 leading-tight" style={{ color: "rgba(225,224,204,0.38)" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* What we stand for */}
        <section>
          <h2 className="text-xl font-bold mb-4" style={{ color: "#E1E0CC" }}>What we stand for</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {STAND_FOR.map(({ icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl p-5 border"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(222,219,200,0.1)" }}
              >
                <div className="text-2xl mb-2">{icon}</div>
                <div className="font-semibold text-sm mb-1" style={{ color: "#E1E0CC" }}>{title}</div>
                <p className="text-[13px] leading-relaxed" style={{ color: "rgba(225,224,204,0.5)" }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Data Sources */}
        <Card>
          <h2 className="text-xl font-bold mb-2" style={{ color: "#E1E0CC" }}>
            Data Sources &amp; Methodology
          </h2>
          <p className="text-[13px] leading-relaxed mb-5" style={{ color: "rgba(225,224,204,0.5)" }}>
            CIVIC AI is an independent citizen transparency platform built on India&apos;s Right to
            Information principles (Article 19(1)(a) of the Constitution). Data is aggregated from
            official Government of India portals released under the National Data Sharing and
            Accessibility Policy (NDSAP) 2012, and publicly accessible verified sources.
          </p>
          <div style={{ borderTop: "1px solid rgba(222,219,200,0.08)" }}>
            {SOURCES.map(({ name, desc }) => (
              <div
                key={name}
                className="py-3 flex flex-col sm:flex-row sm:gap-4"
                style={{ borderBottom: "1px solid rgba(222,219,200,0.06)" }}
              >
                <span
                  className="text-[13px] font-semibold sm:min-w-[12rem] flex-shrink-0"
                  style={{ color: "rgba(96,165,250,0.85)" }}
                >
                  {name}
                </span>
                <span className="text-[13px]" style={{ color: "rgba(225,224,204,0.5)" }}>{desc}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Data Pledge */}
        <section
          className="rounded-2xl p-6 border"
          style={{ background: "rgba(16,185,129,0.06)", borderColor: "rgba(16,185,129,0.2)" }}
        >
          <h2 className="text-base font-bold mb-2" style={{ color: "rgba(52,211,153,0.9)" }}>
            Our Data Pledge
          </h2>
          <p className="text-[13px] leading-relaxed" style={{ color: "rgba(52,211,153,0.75)" }}>
            Every data point is sourced from official government portals, public APIs, and gazetted
            documents. If you find an error, please{" "}
            <Link href="/feedback" className="underline font-medium">let us know</Link>
            . We will correct it within 24 hours.
          </p>
        </section>

        {/* Disclaimer */}
        <section
          className="rounded-2xl p-6 border"
          style={{ background: "rgba(245,158,11,0.06)", borderColor: "rgba(245,158,11,0.2)" }}
        >
          <h2 className="text-base font-bold mb-2" style={{ color: "rgba(251,191,36,0.9)" }}>
            ⚠️ Important Disclaimer
          </h2>
          <p className="text-[13px] leading-relaxed" style={{ color: "rgba(251,191,36,0.75)" }}>
            CIVIC AI is an independent, non-governmental initiative. It is{" "}
            <strong>NOT</strong> an official government website. Data is sourced from public
            government portals under NDSAP and is provided for informational purposes only.
          </p>
        </section>

        {/* Footer */}
        <div
          className="flex items-center justify-center gap-5 text-sm pt-4"
          style={{ borderTop: "1px solid rgba(222,219,200,0.08)", color: "rgba(225,224,204,0.35)" }}
        >
          <Link href="/privacy" className="hover:text-[rgba(225,224,204,0.7)] transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/feedback" className="hover:text-[rgba(225,224,204,0.7)] transition-colors">Feedback</Link>
          <span>·</span>
          <Link href="/" className="hover:text-[rgba(225,224,204,0.7)] transition-colors">Back to App</Link>
        </div>

      </div>
    </main>
  );
}

/* ── Card helper ─────────────────────────────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="rounded-2xl p-8 border"
      style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(222,219,200,0.12)" }}
    >
      {children}
    </section>
  );
}
