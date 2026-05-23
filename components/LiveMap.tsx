// components/LiveMap.tsx

"use client";

import React, { useEffect, useRef } from "react";
import type { RoutePoint }           from "@/types";

interface LiveMapProps {
  active:      boolean;
  routePoints: RoutePoint[];
  style?:      React.CSSProperties;
}

export function LiveMap({ active, routePoints, style }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef       = useRef<any>(null);
  const sourceRef    = useRef<boolean>(false);
  const markerRef    = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;

    import("mapbox-gl").then((mapboxgl) => {
      const mapboxglDefault = mapboxgl.default ?? mapboxgl;
      mapboxglDefault.accessToken = token;

      const map = new mapboxglDefault.Map({
        container: containerRef.current!,
        style:     "mapbox://styles/mapbox/navigation-night-v1", // Apple Maps-like dark
        center:    [31.2357, 30.0444], // Cairo default
        zoom:      15,
        pitch:     45,
        bearing:   0,
        antialias: true,
      });

      map.on("load", () => {
        // Glow underneath route
        map.addSource("route-glow", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id:     "route-glow-layer",
          type:   "line",
          source: "route-glow",
          paint: {
            "line-color":   "#E8350A",
            "line-width":   16,
            "line-opacity": 0.15,
            "line-blur":    8,
          },
          layout: { "line-cap": "round", "line-join": "round" },
        });

        // Main route line
        map.addSource("route", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id:     "route-line",
          type:   "line",
          source: "route",
          paint: {
            "line-color":   "#E8350A",
            "line-width":   4,
            "line-opacity": 0.95,
          },
          layout: { "line-cap": "round", "line-join": "round" },
        });

        // Start marker (green dot)
        const startEl = document.createElement("div");
        startEl.style.cssText = `
          width: 14px; height: 14px;
          background: #22C55E;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 10px #22C55E80;
        `;
        new mapboxglDefault.Marker({ element: startEl });

        sourceRef.current = true;
      });

      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current   = null;
      sourceRef.current = false;
    };
  }, []);

  // Update route when points change
  useEffect(() => {
    if (!mapRef.current || !sourceRef.current) return;

    // Only use points with real GPS coords
    const gpsPoints = routePoints.filter(
      (p) => p.lat !== undefined && p.lng !== undefined,
    );

    if (gpsPoints.length < 2) return;

    const coords = gpsPoints.map((p) => [p.lng!, p.lat!]);

    const geojson = {
      type: "FeatureCollection" as const,
      features: [{
        type:       "Feature" as const,
        geometry:   { type: "LineString" as const, coordinates: coords },
        properties: {},
      }],
    };

    const routeSource = mapRef.current.getSource("route");
    const glowSource  = mapRef.current.getSource("route-glow");

    if (routeSource) routeSource.setData(geojson);
    if (glowSource)  glowSource.setData(geojson);

    // Move live position marker
    const last = gpsPoints[gpsPoints.length - 1];
    if (!last) return;

    if (markerRef.current) {
      markerRef.current.setLngLat([last.lng!, last.lat!]);
    } else {
      import("mapbox-gl").then((mapboxgl) => {
        const mapboxglDefault = mapboxgl.default ?? mapboxgl;

        const el = document.createElement("div");
        el.style.cssText = `
          width: 20px; height: 20px;
          background: #E8350A;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 16px #E8350A, 0 0 32px #E8350A60;
          animation: pulse 1.5s ease-in-out infinite;
        `;

        markerRef.current = new mapboxglDefault.Marker({ element: el })
          .setLngLat([last.lng!, last.lat!])
          .addTo(mapRef.current);
      });
    }

    // Follow the car smoothly
    if (active) {
      mapRef.current.easeTo({
        center:   [last.lng!, last.lat!],
        zoom:     17,
        pitch:    60,
        bearing:  calculateBearing(gpsPoints),
        duration: 800,
      });
    }
  }, [routePoints, active]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", ...style }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* LIVE badge */}
      {active && (
        <div style={{
          position:     "absolute",
          top:          10,
          right:        10,
          background:   "rgba(232,53,10,0.15)",
          border:       "1px solid #E8350A",
          borderRadius: 6,
          padding:      "3px 10px",
          display:      "flex",
          alignItems:   "center",
          gap:          6,
          backdropFilter: "blur(8px)",
        }}>
          <div style={{
            width:        6,
            height:       6,
            borderRadius: "50%",
            background:   "#E8350A",
            animation:    "blink 1s step-end infinite",
          }} />
          <span style={{
            fontFamily:    "'Rajdhani', sans-serif",
            fontWeight:    700,
            fontSize:      11,
            color:         "#E8350A",
            letterSpacing: 2,
          }}>
            LIVE
          </span>
        </div>
      )}

      {/* Mapbox CSS */}
      <style>{`
        .mapboxgl-ctrl-bottom-left,
        .mapboxgl-ctrl-bottom-right,
        .mapboxgl-ctrl-logo { display: none !important; }
      `}</style>
    </div>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function calculateBearing(points: RoutePoint[]): number {
  if (points.length < 2) return 0;
  const prev = points[points.length - 2];
  const curr = points[points.length - 1];
  if (!prev.lat || !prev.lng || !curr.lat || !curr.lng) return 0;

  const dLng  = (curr.lng! - prev.lng!) * (Math.PI / 180);
  const lat1  = prev.lat! * (Math.PI / 180);
  const lat2  = curr.lat! * (Math.PI / 180);
  const y     = Math.sin(dLng) * Math.cos(lat2);
  const x     = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const angle = Math.atan2(y, x) * (180 / Math.PI);

  return (angle + 360) % 360;
}