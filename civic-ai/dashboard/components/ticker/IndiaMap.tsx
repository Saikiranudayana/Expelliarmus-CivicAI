"use client";

import { useEffect, useRef } from "react";

interface Props {
  activeStates: string[];
  comingSoonStates: string[];
  onStateClick?: (state: string) => void;
}

const GEO_URL =
  "https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson";

export default function IndiaMap({ activeStates, comingSoonStates, onStateClick }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (mapRef.current || !divRef.current) return;

    (async () => {
      const L = (await import("leaflet")).default;

      // @ts-expect-error leaflet internal
      delete L.Icon.Default.prototype._getIconUrl;

      if (!document.getElementById("leaflet-india-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-india-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (!divRef.current || mapRef.current) return;

      const map = L.map(divRef.current, {
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        attributionControl: false,
      });

      mapRef.current = map;
      map.fitBounds([
        [7.5, 68.0],
        [37.5, 97.5],
      ]);

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geo: any = await (await fetch(GEO_URL)).json();

        const geoLayer = L.geoJSON(geo, {
          style(f) {
            const nm = String(f?.properties?.ST_NM ?? "").toLowerCase();
            if (
              activeStates.some(
                (s) =>
                  nm.includes(s.toLowerCase()) ||
                  s.toLowerCase().includes(nm)
              )
            ) {
              return {
                fillColor: "#3b82f6",
                weight: 0.8,
                color: "#93c5fd",
                fillOpacity: 0.65,
                opacity: 1,
              };
            }
            if (
              comingSoonStates.some(
                (s) =>
                  nm.includes(s.toLowerCase()) ||
                  s.toLowerCase().includes(nm)
              )
            ) {
              return {
                fillColor: "#64748b",
                weight: 0.4,
                color: "#94a3b8",
                fillOpacity: 0.35,
                opacity: 0.7,
              };
            }
            return {
              fillColor: "#cbd5e1",
              weight: 0.2,
              color: "#e2e8f0",
              fillOpacity: 0.12,
              opacity: 0.3,
            };
          },
          onEachFeature(f, layer) {
            const nm = String(f?.properties?.ST_NM ?? "");
            layer.on({
              mouseover(e) {
                (e.target as L.Path).setStyle({ fillOpacity: 0.88, weight: 1.5 });
                (e.target as L.Path).bringToFront();
              },
              mouseout() {
                geoLayer.resetStyle(layer as unknown as L.Path);
              },
              click() {
                onStateClick?.(nm);
              },
            });
          },
        }).addTo(map);
      } catch {
        /* silent fail — map background stays visible */
      }
    })();

    return () => {
      if (mapRef.current) {
        (mapRef.current as { remove(): void }).remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Map container — light-blue sky background shows states clearly */}
      <div
        ref={divRef}
        style={{ width: "100%", height: "100%", background: "#e0f2fe" }}
      />

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: 38,
          right: 10,
          background: "rgba(255,255,255,0.94)",
          borderRadius: 7,
          padding: "6px 10px",
          fontSize: 10,
          color: "#374151",
          zIndex: 1000,
          lineHeight: 1.8,
          boxShadow: "0 1px 6px rgba(0,0,0,0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              background: "#3b82f6",
              borderRadius: 2,
              flexShrink: 0,
            }}
          />
          Active
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              background: "#64748b",
              borderRadius: 2,
              flexShrink: 0,
            }}
          />
          Coming Soon
        </div>
      </div>

      {/* Hint */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 10,
          color: "#78716c",
          zIndex: 1000,
          whiteSpace: "nowrap",
          background: "rgba(255,255,255,0.82)",
          padding: "2px 8px",
          borderRadius: 4,
        }}
      >
        🔥 Click a state to explore
      </div>
    </div>
  );
}
