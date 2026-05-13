"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

const BBMP_TERMS: { word: string; weight: number; category: string }[] = [
  { word: "Budget",          weight: 10, category: "finance"  },
  { word: "BBMP",            weight: 10, category: "civic"    },
  { word: "Ward",            weight: 9,  category: "civic"    },
  { word: "Infrastructure",  weight: 8,  category: "infra"    },
  { word: "Bengaluru",       weight: 8,  category: "civic"    },
  { word: "Revenue",         weight: 7,  category: "finance"  },
  { word: "Expenditure",     weight: 7,  category: "finance"  },
  { word: "Drainage",        weight: 6,  category: "infra"    },
  { word: "Roads",           weight: 6,  category: "infra"    },
  { word: "Parks",           weight: 5,  category: "civic"    },
  { word: "Water",           weight: 5,  category: "infra"    },
  { word: "Property Tax",    weight: 5,  category: "finance"  },
  { word: "SWM",             weight: 4,  category: "infra"    },
  { word: "Committee",       weight: 4,  category: "civic"    },
  { word: "Karnataka",       weight: 4,  category: "policy"   },
  { word: "Grant",           weight: 4,  category: "finance"  },
  { word: "Solid Waste",     weight: 4,  category: "infra"    },
  { word: "Council",         weight: 3,  category: "civic"    },
  { word: "Scheme",          weight: 3,  category: "policy"   },
  { word: "Allocations",     weight: 3,  category: "finance"  },
  { word: "Policy",          weight: 3,  category: "policy"   },
  { word: "Tender",          weight: 3,  category: "finance"  },
  { word: "Zones",           weight: 2,  category: "civic"    },
  { word: "Meeting",         weight: 2,  category: "civic"    },
  { word: "Resolution",      weight: 2,  category: "civic"    },
  { word: "Footpath",        weight: 2,  category: "infra"    },
  { word: "Lighting",        weight: 2,  category: "infra"    },
  { word: "Sanitation",      weight: 2,  category: "infra"    },
];

const CATEGORY_COLORS: Record<string, string> = {
  finance: "#E1E0CC",
  civic:   "rgba(222,219,200,0.75)",
  infra:   "rgba(222,219,200,0.55)",
  policy:  "rgba(222,219,200,0.4)",
};

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export default function WordCloud() {
  const words = useMemo(() => {
    return BBMP_TERMS.map((item, i) => ({
      ...item,
      fontSize: Math.round(10 + item.weight * 2.8),
      rotate:   (seededRandom(i * 3) > 0.7 ? (seededRandom(i * 7) > 0.5 ? 90 : -90) : 0),
      opacity:  0.4 + item.weight * 0.06,
      delay:    i * 0.04,
    }));
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl bg-[#101010] border border-[rgba(222,219,200,0.08)]"
      style={{ height: 220 }}
    >
      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-3 p-6 overflow-hidden">
        {words.map((w, i) => (
          <motion.span
            key={w.word}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: w.opacity, scale: 1 }}
            transition={{
              delay: w.delay,
              duration: 0.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="cursor-default select-none font-medium leading-none whitespace-nowrap"
            style={{
              fontSize:  w.fontSize,
              color:     CATEGORY_COLORS[w.category],
              transform: w.rotate ? `rotate(${w.rotate}deg)` : undefined,
              display:   "inline-block",
            }}
            whileHover={{ scale: 1.15, opacity: 1 }}
            title={`${w.word} · ${w.category}`}
          >
            {w.word}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
