// screens/ProfileScreen.tsx

"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion }          from "framer-motion";
import { C, FONT, BADGE_CONFIG } from "@/lib/constants";
import { useProfile }      from "@/hooks/useProfile";
import { useSession }      from "@/hooks/useSession";
import { createClient }    from "@/lib/supabase/client";
import type { VerificationType, PrivacySettings } from "@/types";

interface ProfileScreenProps {}

export function ProfileScreen(_props: ProfileScreenProps) {
  const { profile, updateProfile, refresh } = useProfile();
  const { user, signOut }                   = useSession();

  const [privacy, setPrivacy] = useState<PrivacySettings>({
    speed: false, map: false, history: false,
  });

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    const p = profile as any;
    setPrivacy({
      speed:   p.hide_speed   ?? false,
      map:     p.hide_maps    ?? false,
      history: p.hide_history ?? false,
    });
  }, [profile]);

  const togglePrivacy = (key: keyof PrivacySettings) =>
    setPrivacy((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Avatar Upload ──────────────────────────────────────────────────────────
  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be less than 5MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }

    setUploadingAvatar(true);
    try {
      const supabase = createClient();
      const ext      = file.name.split(".").pop();
      const path     = `${user.id}/avatar.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        alert("Upload failed: " + uploadError.message);
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      // Update profile
      await updateProfile({ avatar: publicUrl });
      await refresh();
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!profile) return null;

  const initials = (profile.username ?? "??")
    .split("_")
    .map((w: string) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/auth/signin";
  };

  return (
    <div style={{ padding: "24px 20px", paddingBottom: 100 }}>

      {/* ── Avatar + name ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28, textAlign: "center" }}>

        {/* Avatar — clickable */}
        <div
          onClick={handleAvatarClick}
          style={{
            position:       "relative",
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
            cursor:         "pointer",
            animation:      "glow-pulse 3s ease-in-out infinite",
            overflow:       "hidden",
          }}
        >
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt="avatar"
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
            />
          ) : (
            initials
          )}

          {/* Overlay on hover */}
          <div style={{
            position:       "absolute",
            inset:          0,
            background:     "rgba(0,0,0,0.5)",
            borderRadius:   "50%",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
            opacity:        uploadingAvatar ? 1 : 0,
            transition:     "opacity 0.2s",
          }}>
            {uploadingAvatar ? (
              <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${C.white}`, borderTop: "2px solid transparent", animation: "spin-slow 0.8s linear infinite" }} />
            ) : (
              <span style={{ fontSize: 20 }}>📷</span>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleAvatarChange}
        />

        <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.muted, marginBottom: 10, letterSpacing: 1 }}>
          Tap avatar to change photo
        </div>

        <h2 className="display" style={{ fontSize: 24, letterSpacing: 3, color: C.text, marginBottom: 4 }}>
          {profile.username ?? "Anonymous"}
        </h2>

        {profile.bio && (
          <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.muted, maxWidth: 280, lineHeight: 1.5, marginTop: 4 }}>
            {profile.bio}
          </p>
        )}
      </div>

      {/* ── Quick stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "MEMBER SINCE", value: new Date(profile.created_at).getFullYear().toString() },
          { label: "PROFILE ID",   value: profile.id.slice(0, 8).toUpperCase() },
        ].map((s) => (
          <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
            <div className="display" style={{ fontSize: 16, color: C.text, letterSpacing: 1, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontFamily: FONT.body, fontSize: 9, color: C.muted, letterSpacing: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Edit profile ── */}
      <SectionCard title="EDIT PROFILE" style={{ marginBottom: 14 }}>
        <EditProfileForm
          currentUsername={profile.username ?? ""}
          currentBio={profile.bio ?? ""}
          onSave={async (data) => { await updateProfile(data); }}
        />
      </SectionCard>

      {/* ── Privacy controls ── */}
      <SectionCard title="PRIVACY CONTROLS" style={{ marginBottom: 14 }}>
        {[
          { key: "speed"   as const, label: "Hide Speed Data",   desc: "Your top speed won't appear publicly" },
          { key: "map"     as const, label: "Hide Map & Routes", desc: "Route replays hidden from others"     },
          { key: "history" as const, label: "Hide Race History", desc: "Run history visible to you only"      },
        ].map((ctrl, i, arr) => (
          <React.Fragment key={ctrl.key}>
            {i > 0 && <div style={{ borderTop: `1px solid ${C.border}`, margin: "12px 0" }} />}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 2 }}>{ctrl.label}</div>
                <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.muted }}>{ctrl.desc}</div>
              </div>
              <ToggleSwitch checked={privacy[ctrl.key]} onChange={() => togglePrivacy(ctrl.key)} />
            </div>
          </React.Fragment>
        ))}
      </SectionCard>

      {/* ── Sign out ── */}
      <SectionCard title="ACCOUNT" style={{ marginBottom: 40 }}>
        <button
          onClick={handleSignOut}
          style={{
            width:         "100%",
            padding:       "12px",
            background:    "transparent",
            border:        `1px solid ${C.border}`,
            borderRadius:  8,
            color:         C.muted,
            fontFamily:    FONT.body,
            fontWeight:    700,
            fontSize:      13,
            letterSpacing: 2,
            cursor:        "pointer",
            transition:    "border-color 0.2s, color 0.2s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget).style.borderColor = C.accent;
            (e.currentTarget).style.color       = C.accent;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget).style.borderColor = C.border;
            (e.currentTarget).style.color       = C.muted;
          }}
        >
          SIGN OUT
        </button>
      </SectionCard>
    </div>
  );
}

// ─── EDIT PROFILE FORM ────────────────────────────────────────────────────────

interface EditProfileFormProps {
  currentUsername: string;
  currentBio:      string;
  onSave:          (data: { username?: string; bio?: string }) => Promise<void>;
}

function EditProfileForm({ currentUsername, currentBio, onSave }: EditProfileFormProps) {
  const [username, setUsername] = useState(currentUsername);
  const [bio,      setBio]      = useState(currentBio);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);

    const payload: { username?: string; bio?: string } = {};
    if (username !== currentUsername) payload.username = username;
    if (bio      !== currentBio)      payload.bio      = bio;

    if (Object.keys(payload).length === 0) { setSaving(false); return; }

    try {
      await onSave(payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <label style={{ display: "block", fontFamily: FONT.body, fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.muted, marginBottom: 6 }}>USERNAME</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={30}
          style={{ width: "100%", padding: "12px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: FONT.body, fontWeight: 600, fontSize: 14, outline: "none", caretColor: C.accent }}
        />
      </div>

      <div>
        <label style={{ display: "block", fontFamily: FONT.body, fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.muted, marginBottom: 6 }}>BIO</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={160}
          rows={3}
          style={{ width: "100%", padding: "12px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: FONT.body, fontWeight: 600, fontSize: 14, outline: "none", caretColor: C.accent, resize: "none", lineHeight: 1.5 }}
        />
        <div style={{ fontFamily: FONT.body, fontSize: 10, color: C.dim, textAlign: "right", marginTop: 4 }}>{bio.length}/160</div>
      </div>

      {error && <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.accent }}>{error}</div>}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding:       "12px",
          background:    saved ? `${C.green}15` : `${C.accent}15`,
          border:        `1px solid ${saved ? C.green : C.accent}`,
          borderRadius:  8,
          color:         saved ? C.green : C.accent,
          fontFamily:    FONT.display,
          fontSize:      16,
          letterSpacing: 3,
          cursor:        saving ? "not-allowed" : "pointer",
          transition:    "all 0.2s",
        }}
      >
        {saving ? "SAVING…" : saved ? "✓ SAVED" : "SAVE CHANGES"}
      </button>
    </div>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

interface SectionCardProps {
  title:    string;
  children: React.ReactNode;
  style?:   React.CSSProperties;
}

function SectionCard({ title, children, style }: SectionCardProps) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", ...style }}>
      <div style={{ fontFamily: FONT.body, fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.muted, marginBottom: 14 }}>{title}</div>
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
      style={{ width: 50, height: 28, borderRadius: 14, border: "none", cursor: "pointer", background: checked ? C.accent : C.dim, transition: "background 0.25s", position: "relative", flexShrink: 0 }}
    >
      <div style={{ position: "absolute", top: 3, left: checked ? 24 : 3, width: 22, height: 22, borderRadius: "50%", background: C.white, transition: "left 0.25s" }} />
    </button>
  );
}