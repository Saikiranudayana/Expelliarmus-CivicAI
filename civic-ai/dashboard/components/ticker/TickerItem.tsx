/**
 * civic-ai/dashboard/components/ticker/TickerItem.tsx
 *
 * A single item in the Live Data Ticker bar.
 * If `href` is provided the item is wrapped in a Next.js <Link>.
 */

import Link from "next/link";

interface TickerItemProps {
  /** Emoji or text icon displayed before the label */
  icon: string;
  /** Human-readable label, e.g. "Documents Ingested" */
  label: string;
  /** Value to display, e.g. "142" */
  value: string;
  /** Optional URL — wraps the item in a Next.js Link when provided */
  href?: string;
}

function ItemContent({ icon, label, value }: Omit<TickerItemProps, "href">) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap px-4 text-xs font-medium">
      <span aria-hidden="true">{icon}</span>
      <span className="text-[rgba(222,219,200,0.6)]">{label}:</span>
      <span className="text-[#DEDBC8]">{value}</span>
    </span>
  );
}

export default function TickerItem({ icon, label, value, href }: TickerItemProps) {
  if (href) {
    return (
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
      >
        <ItemContent icon={icon} label={label} value={value} />
      </Link>
    );
  }

  return <ItemContent icon={icon} label={label} value={value} />;
}
