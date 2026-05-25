// screens/ProfileScreen.tsx

"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { C, FONT, BADGE_CONFIG } from "@/lib/constants";
import { MOCK_RACERS } from "@/lib/mockData";
import type { PrivacySettings, VerificationType } from "@/types";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ProfileScreenProps {
  // No external props — uses first mock racer as "current user"
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

// Use the first mock racer as the logged-in user profile
const ME = MOCK_RACERS[0];

const STAT_ROWS = [
  { label: "BEST TIME",    value: ME.bestTime   },
  { label: "TOP SPEED",    value: `${ME.topSpeed} km/h` },
  { label: "TOTAL RACES",  value: String(ME.races) },
  { label: "AVG SPEED",    value: "228 km/h"    },
] as const;

const PRIVACY_CONTROLS = [
  { key: "speed"   as const, label: "Hide Speed Data",    desc: "Your top speed won't appear publicly" },
  { key: "map"     as const, label: "Hide Map & Routes",  desc: "Route replays hidden from others"    },
  { key: "history" as const, label: "Hide Race History",  desc: "Run history visible to you only"     },
] as const;

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export function ProfileScreen(_props: ProfileScreenProps) {
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    speed:   false,
    map:     false,
    history: false,
  });


  const togglePrivacy = (key: keyof PrivacySettings) =>
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div style={{ padding: "24px 20px" }}>

      {/* ── Profile hero ── */}
      <ProfileHero onEditClick={() => {}} />

      {/* ── Edit mode banner ── */}

      {/* ── Vehicle card ── */}
      <VehicleCard />

      {/* ── Stats grid ── */}
      <StatsGrid />

      {/* ── Privacy controls ── */}
      <PrivacyCard
        privacy={privacy}
        onToggle={togglePrivacy}
      />

      {/* ── Social links ── */}
      <SocialCard />

      {/* ── Verification status ── */}
      <VerificationCard />

      {/* ── Danger zone ── */}
      <DangerZone />

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE HERO
// ─────────────────────────────────────────────────────────────────────────────

interface ProfileHeroProps {
  onEditClick: () => void;
}

function ProfileHero({ onEditClick }: ProfileHeroProps) {
  return (
    <div
      style={{
        display:       "flex",
        flexDirection: "column",
        alignItems:    "center",
        marginBottom:  28,
        textAlign:     "center",
      }}
    >
      {/* Avatar */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1,   opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          width:          90,
          height:         90,
          borderRadius:   "50%",
          background:     `${C.accent}20`,
          border:         `3px solid ${C.accent}`,
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          fontFamily:     FONT.display,
          fontSize:       36,
          color:          C.text,
          marginBottom:   14,
          animation:      "glow-pulse 3s ease-in-out infinite",
        }}
      >
        {ME.avatar}
      </motion.div>

      {/* Name + country */}
      <div
        style={{
          display:    "flex",
          alignItems: "center",
          gap:        8,
          marginBottom: 5,
        }}
      >
        <h2
          className="display"
          style={{ fontSize: 24, letterSpacing: 3, color: C.text }}
        >
          {ME.name}
        </h2>
        <span style={{ fontSize: 18 }}>{ME.country}</span>
      </div>

      {/* Tag */}
      <div
        style={{
          fontFamily:    FONT.body,
          fontSize:      13,
          color:         C.muted,
          marginBottom:  10,
          letterSpacing: 1,
        }}
      >
        {ME.tag}
      </div>

      {/* Verification badge */}
      <VerificationBadge type={ME.verified} />

      {/* Edit button */}
      <button
        onClick={onEditClick}
        style={{
          marginTop:     14,
          padding:       "8px 24px",
          background:    "transparent",
          border:        `1px solid ${C.border}`,
          borderRadius:  8,
          color:         C.muted,
          fontFamily:    FONT.body,
          fontWeight:    700,
          fontSize:      12,
          letterSpacing: 2,
          cursor:        "pointer",
          transition:    "border-color 0.2s, color 0.2s",
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLButtonElement).style.borderColor = C.accent;
          (e.target as HTMLButtonElement).style.color       = C.accent;
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLButtonElement).style.borderColor = C.border;
          (e.target as HTMLButtonElement).style.color       = C.muted;
        }}
      >
        EDIT PROFILE
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VEHICLE CARD
// ─────────────────────────────────────────────────────────────────────────────

function VehicleCard() {
  const vehicleStats = [
    { label: "HP",     value: String(ME.hp)       },
    { label: "RACES",  value: String(ME.races)     },
    { label: "TOP",    value: `${ME.topSpeed} km/h` },
  ] as const;

  return (
    <SectionCard title="VEHICLE" style={{ marginBottom: 14 }}>
      {/* Car name */}
      <div
        className="display"
        style={{
          fontSize:      22,
          letterSpacing: 2,
          color:         C.text,
          marginBottom:  12,
        }}
      >
        {ME.car}
      </div>

      {/* Stats row */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap:                 12,
        }}
      >
        {vehicleStats.map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div
              className="display"
              style={{ fontSize: 22, color: C.text, lineHeight: 1 }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontFamily:    FONT.body,
                fontSize:      9,
                color:         C.muted,
                letterSpacing: 2,
                marginTop:     4,
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Torque (if available) */}
      {ME.torque && (
        <div
          style={{
            marginTop:  12,
            paddingTop: 12,
            borderTop:  `1px solid ${C.border}`,
            display:    "flex",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontFamily:    FONT.body,
              fontSize:      12,
              color:         C.muted,
              letterSpacing: 1,
            }}
          >
            TORQUE
          </span>
          <span
            style={{
              fontFamily: FONT.body,
              fontWeight: 700,
              fontSize:   13,
              color:      C.text,
            }}
          >
            {ME.torque} Nm
          </span>
        </div>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS GRID
// ─────────────────────────────────────────────────────────────────────────────

function StatsGrid() {
  return (
    <div
      style={{
        display:             "grid",
        gridTemplateColumns: "1fr 1fr",
        gap:                 10,
        marginBottom:        14,
      }}
    >
      {STAT_ROWS.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y:  0 }}
          transition={{ delay: i * 0.06, duration: 0.25 }}
          style={{
            background:   C.card,
            border:       `1px solid ${C.border}`,
            borderRadius: 10,
            padding:      "14px 16px",
            textAlign:    "center",
          }}
        >
          <div
            className="display"
            style={{
              fontSize:      20,
              color:         C.text,
              letterSpacing: 1,
              lineHeight:    1,
              marginBottom:  4,
            }}
          >
            {s.value}
          </div>
          <div
            style={{
              fontFamily:    FONT.body,
              fontSize:      9,
              color:         C.muted,
              letterSpacing: 2,
            }}
          >
            {s.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRIVACY CARD
// ─────────────────────────────────────────────────────────────────────────────

interface PrivacyCardProps {
  privacy:  PrivacySettings;
  onToggle: (key: keyof PrivacySettings) => void;
}

function PrivacyCard({ privacy, onToggle }: PrivacyCardProps) {
  return (
    <SectionCard title="PRIVACY CONTROLS" style={{ marginBottom: 14 }}>
      {PRIVACY_CONTROLS.map((ctrl, i) => (
        <React.Fragment key={ctrl.key}>
          {i > 0 && (
            <div
              style={{
                borderTop: `1px solid ${C.border}`,
                margin:    "12px 0",
              }}
            />
          )}
          <div
            style={{
              display:        "flex",
              justifyContent: "space-between",
              alignItems:     "center",
              gap:            12,
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: FONT.body,
                  fontWeight: 700,
                  fontSize:   14,
                  color:      C.text,
                  marginBottom: 2,
                }}
              >
                {ctrl.label}
              </div>
              <div
                style={{
                  fontFamily: FONT.body,
                  fontSize:   11,
                  color:      C.muted,
                }}
              >
                {ctrl.desc}
              </div>
            </div>
            <ToggleSwitch
              checked={privacy[ctrl.key]}
              onChange={() => onToggle(ctrl.key)}
            />
          </div>
        </React.Fragment>
      ))}

      {/* Profile lock */}
      <div
        style={{
          borderTop: `1px solid ${C.border}`,
          marginTop: 12,
          paddingTop: 12,
        }}
      >
        <div
          style={{
            fontFamily:    FONT.body,
            fontSize:      11,
            color:         C.muted,
            letterSpacing: 1,
          }}
        >
          Locked profiles appear in search results but display no stats.
        </div>
      </div>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL CARD
// ─────────────────────────────────────────────────────────────────────────────

function SocialCard() {
  const links = [
    { label: "Instagram", value: ME.instagram, icon: "📸" },
    { label: "Twitter",   value: ME.twitter,   icon: "🐦" },
    { label: "YouTube",   value: ME.youtube,   icon: "▶️" },
  ].filter((l) => l.value) as { label: string; value: string; icon: string }[];

  if (links.length === 0) return null;

  return (
    <SectionCard title="SOCIAL" style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {links.map((l) => (
          <div
            key={l.label}
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "space-between",
            }}
          >
            <span
              style={{
                fontFamily:    FONT.body,
                fontSize:      13,
                color:         C.muted,
                letterSpacing: 1,
                display:       "flex",
                alignItems:    "center",
                gap:           8,
              }}
            >
              <span>{l.icon}</span>
              {l.label}
            </span>
            <span
              style={{
                fontFamily: FONT.body,
                fontWeight: 700,
                fontSize:   13,
                color:      C.accent,
              }}
            >
              @{l.value}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VERIFICATION CARD
// ─────────────────────────────────────────────────────────────────────────────

function VerificationCard() {
  const verifications = [
    {
      type:    "racer"  as VerificationType,
      label:   "Verified Racer",
      desc:    "Identity and racing credentials confirmed",
      active:  ME.verified === "racer",
    },
    {
      type:    "car"    as VerificationType,
      label:   "Verified Car",
      desc:    "Vehicle specs confirmed by an official inspector",
      active:  ME.verified === "car",
    },
    {
      type:    "tuner"  as VerificationType,
      label:   "Verified Tuner",
      desc:    "Tuning expertise and build logs verified",
      active:  ME.verified === "tuner",
    },
  ];

  return (
    <SectionCard title="VERIFICATION" style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {verifications.map((v) => {
          const cfg = BADGE_CONFIG[v.type];
          return (
            <div
              key={v.type}
              style={{
                display:     "flex",
                alignItems:  "center",
                gap:         12,
                padding:     "10px 12px",
                background:  v.active ? `${cfg.color}10` : C.surface,
                border:      `1px solid ${v.active ? cfg.color + "40" : C.border}`,
                borderRadius: 8,
              }}
            >
              {/* Status dot */}
              <div
                style={{
                  width:        8,
                  height:       8,
                  borderRadius: "50%",
                  background:   v.active ? cfg.color : C.dim,
                  flexShrink:   0,
                }}
              />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: FONT.body,
                    fontWeight: 700,
                    fontSize:   13,
                    color:      v.active ? cfg.color : C.muted,
                  }}
                >
                  {v.label}
                </div>
                <div
                  style={{
                    fontFamily: FONT.body,
                    fontSize:   11,
                    color:      C.muted,
                    marginTop:  2,
                  }}
                >
                  {v.desc}
                </div>
              </div>
              {/* Status label */}
              <span
                style={{
                  fontFamily:    FONT.body,
                  fontSize:      9,
                  fontWeight:    700,
                  letterSpacing: 2,
                  color:         v.active ? cfg.color : C.dim,
                }}
              >
                {v.active ? "ACTIVE" : "NONE"}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop:     12,
          fontFamily:    FONT.body,
          fontSize:      11,
          color:         C.muted,
          letterSpacing: 1,
        }}
      >
        To apply for verification, contact an arena admin.
      </div>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DANGER ZONE
// ─────────────────────────────────────────────────────────────────────────────

function DangerZone() {
  const [confirming, setConfirming] = useState(false);

  return (
    <SectionCard
      title="DANGER ZONE"
      titleColor={C.accent}
      style={{ marginBottom: 40 }}
    >
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          style={{
            width:         "100%",
            padding:       "12px",
            background:    `${C.accent}10`,
            border:        `1px solid ${C.accent}40`,
            borderRadius:  8,
            color:         C.accent,
            fontFamily:    FONT.body,
            fontWeight:    700,
            fontSize:      13,
            letterSpacing: 2,
            cursor:        "pointer",
            transition:    "background 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = `${C.accent}20`;
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = `${C.accent}10`;
          }}
        >
          DELETE ACCOUNT
        </button>
      ) : (
        <div>
          <p
            style={{
              fontFamily:   FONT.body,
              fontSize:     13,
              color:        C.muted,
              marginBottom: 12,
              lineHeight:   1.5,
            }}
          >
            This will permanently delete all your races, stats, and profile
            data. This action cannot be undone.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button
              onClick={() => setConfirming(false)}
              style={{
                padding:       "10px",
                background:    "transparent",
                border:        `1px solid ${C.border}`,
                borderRadius:  8,
                color:         C.muted,
                fontFamily:    FONT.body,
                fontWeight:    700,
                fontSize:      12,
                letterSpacing: 2,
                cursor:        "pointer",
              }}
            >
              CANCEL
            </button>
            <button
              style={{
                padding:       "10px",
                background:    C.accent,
                border:        "none",
                borderRadius:  8,
                color:         C.white,
                fontFamily:    FONT.body,
                fontWeight:    700,
                fontSize:      12,
                letterSpacing: 2,
                cursor:        "pointer",
              }}
            >
              CONFIRM DELETE
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

interface SectionCardProps {
  title:      string;
  titleColor?: string;
  children:   React.ReactNode;
  style?:     React.CSSProperties;
}

function SectionCard({
  title,
  titleColor = C.muted,
  children,
  style,
}: SectionCardProps) {
  return (
    <div
      style={{
        background:   C.card,
        border:       `1px solid ${C.border}`,
        borderRadius: 12,
        padding:      "16px 20px",
        ...style,
      }}
    >
      <div
        style={{
          fontFamily:    FONT.body,
          fontSize:      10,
          fontWeight:    700,
          letterSpacing: 3,
          color:         titleColor,
          marginBottom:  14,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

interface ToggleSwitchProps {
  checked:  boolean;
  onChange: () => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      style={{
        width:        50,
        height:       28,
        borderRadius: 14,
        border:       "none",
        cursor:       "pointer",
        background:   checked ? C.accent : C.dim,
        transition:   "background 0.25s",
        position:     "relative",
        flexShrink:   0,
      }}
    >
      <div
        style={{
          position:     "absolute",
          top:          3,
          left:         checked ? 24 : 3,
          width:        22,
          height:       22,
          borderRadius: "50%",
          background:   C.white,
          transition:   "left 0.25s",
        }}
      />
    </button>
  );
}

interface VerificationBadgeProps {
  type: VerificationType;
}

function VerificationBadge({ type }: VerificationBadgeProps) {
  const cfg = BADGE_CONFIG[type];
  if (!cfg) return null;

  return (
    <span
      style={{
        fontSize:      9,
        fontWeight:    700,
        letterSpacing: 2,
        padding:       "2px 7px",
        borderRadius:  4,
        background:    `${cfg.color}18`,
        color:         cfg.color,
        border:        `1px solid ${cfg.color}40`,
        fontFamily:    FONT.body,
      }}
    >
      {cfg.label}
    </span>
  );
}