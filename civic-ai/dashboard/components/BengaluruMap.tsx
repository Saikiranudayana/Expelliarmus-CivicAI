"use client";

import { useEffect, useRef } from "react";

/* Dynamically import Leaflet to avoid SSR errors */
export default function BengaluruMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletInstance = useRef<unknown>(null);

  useEffect(() => {
    if (leafletInstance.current || !mapRef.current) return;

    async function init() {
      const L = (await import("leaflet")).default;
      // Fix default icon paths broken by webpack
      // @ts-expect-error leaflet internal
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapRef.current || leafletInstance.current) return;

      const map = L.map(mapRef.current, {
        center:     [12.9716, 77.5946],
        zoom:       11,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      leafletInstance.current = map;

      // OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 18,
      }).addTo(map);

      // BBMP civic markers
      const markers: [number, number, string, string][] = [
        [12.9716, 77.5946, "BBMP Head Office", "Headquarters"],
        [12.9762, 77.6033, "Shivajinagar Ward",     "Ward Committee"],
        [12.9352, 77.6244, "Koramangala",    "Active Budget Zone"],
        [13.0297, 77.5477, "Yeshwanthpur",   "Infrastructure Project"],
        [12.9141, 77.6101, "Jayanagar",      "Heritage Ward"],
        [12.9698, 77.7499, "Whitefield",     "IT Corridor Zone"],
        [13.0358, 77.5970, "Hebbal",         "North Zone HQ"],
        [12.9279, 77.5830, "Banashankari",   "South Zone"],
        [12.9784, 77.6408, "Indiranagar",    "East Zone"],
        [13.0671, 77.5814, "Yelahanka",      "Outer Ring Road Zone"],
      ];

      const customIcon = L.divIcon({
        className: "",
        html: `<div style="width:10px;height:10px;background:#DEDBC8;border-radius:50%;border:2px solid rgba(222,219,200,0.4);box-shadow:0 0 8px rgba(222,219,200,0.5)"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });

      markers.forEach(([lat, lng, title, subtitle]) => {
        L.marker([lat, lng], { icon: customIcon })
          .addTo(map)
          .bindPopup(
            `<div style="font-family:Almarai,sans-serif;padding:4px">
               <strong style="color:#E1E0CC;display:block;margin-bottom:2px">${title}</strong>
               <span style="color:#888;font-size:11px">${subtitle}</span>
             </div>`,
            { className: "civic-popup" }
          );
      });
    }

    // import leaflet CSS
    const link = document.createElement("link");
    link.rel  = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    init();

    return () => {
      if (leafletInstance.current) {
        (leafletInstance.current as { remove: () => void }).remove();
        leafletInstance.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={mapRef}
      className="w-full rounded-xl overflow-hidden"
      style={{ height: 320 }}
    />
  );
}
