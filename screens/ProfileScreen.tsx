// screens/ProfileScreen.tsx

"use client";

import React, { useRef, useState } from "react";
import { C, FONT } from "@/lib/constants";
import { useProfile, type UpdateProfileResult } from "@/hooks/useProfile";
import { useSession } from "@/hooks/useSession";
import { createClient } from "@/lib/supabase/client";

export function ProfileScreen() {
  const { profile, updateProfile, refresh } = useProfile();
  const { user, signOut } = useSession();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!profile) return null;

  const initials = (profile.username ?? "??")
    .split("_")
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

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
      const rawExtension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const extension = rawExtension.replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${user.id}/avatar.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        alert("Upload failed: " + uploadError.message);
        return;
      }

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const result = await updateProfile({ avatar: publicUrl });
      if (!result.success) {
        alert(result.error ?? "Failed to update avatar.");
        return;
      }
      await refresh();
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/auth/signin";
  };

  return (
    <div style={{ padding: "24px 20px", paddingBottom: 100 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 28, textAlign: "center" }}>
        <button
          type="button"
          aria-label="Change avatar"
          onClick={() => fileInputRef.current?.click()}
          style={{
            position: "relative", width: 90, height: 90, borderRadius: "50%",
            background: `${C.accent}20`, border: `3px solid ${C.accent}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: FONT.display, fontSize: 36, color: C.text, marginBottom: 14,
            cursor: uploadingAvatar ? "wait" : "pointer", overflow: "hidden",
          }}
        >
          {profile.avatar ? (
            <img src={profile.avatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : initials}
          {uploadingAvatar && (
            <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.55)", fontSize: 12 }}>
              UPLOADING…
            </span>
          )}
        </button>

        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />

        <h2 className="display" style={{ fontSize: 24, letterSpacing: 3, color: C.text, marginBottom: 4 }}>
          {profile.username ?? "Anonymous"}
        </h2>
        {profile.bio && <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.muted, maxWidth: 280 }}>{profile.bio}</p>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <Stat label="MEMBER SINCE" value={new Date(profile.created_at).getFullYear().toString()} />
        <Stat label="PROFILE ID" value={profile.id.slice(0, 8).toUpperCase()} />
      </div>

      <SectionCard title="EDIT PROFILE">
        <EditProfileForm
          currentUsername={profile.username ?? ""}
          currentBio={profile.bio ?? ""}
          onSave={updateProfile}
        />
      </SectionCard>

      <div style={{ marginTop: 14, padding: "12px 14px", border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, fontFamily: FONT.body, fontSize: 12 }}>
        Advanced privacy controls are temporarily hidden while they are rebuilt to enforce privacy server-side. Private Run remains available when starting a race.
      </div>

      <SectionCard title="ACCOUNT" style={{ marginTop: 14 }}>
        <button onClick={handleSignOut} style={{ width: "100%", padding: 12, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, fontFamily: FONT.body, fontWeight: 700, cursor: "pointer" }}>
          SIGN OUT
        </button>
      </SectionCard>
    </div>
  );
}

function EditProfileForm({
  currentUsername,
  currentBio,
  onSave,
}: {
  currentUsername: string;
  currentBio: string;
  onSave: (data: { username?: string; bio?: string }) => Promise<UpdateProfileResult>;
}) {
  const [username, setUsername] = useState(currentUsername);
  const [bio, setBio] = useState(currentBio);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const payload: { username?: string; bio?: string } = {};
    if (username !== currentUsername) payload.username = username;
    if (bio !== currentBio) payload.bio = bio;
    if (Object.keys(payload).length === 0) return;

    setSaving(true);
    setSaved(false);
    setError(null);
    const result = await onSave(payload);
    setSaving(false);

    if (!result.success) {
      setError(result.error ?? "Failed to save. Please try again.");
      return;
    }

    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label style={{ fontFamily: FONT.body, fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.muted }}>
        USERNAME
        <input value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30}
          style={{ display: "block", width: "100%", marginTop: 6, padding: "12px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: FONT.body }} />
      </label>
      <label style={{ fontFamily: FONT.body, fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.muted }}>
        BIO
        <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} rows={3}
          style={{ display: "block", width: "100%", marginTop: 6, padding: "12px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontFamily: FONT.body, resize: "none" }} />
      </label>
      {error && <div style={{ color: C.accent, fontFamily: FONT.body, fontSize: 12 }}>{error}</div>}
      <button onClick={handleSave} disabled={saving}
        style={{ padding: 12, background: `${saved ? C.green : C.accent}15`, border: `1px solid ${saved ? C.green : C.accent}`, borderRadius: 8, color: saved ? C.green : C.accent, fontFamily: FONT.display, fontSize: 16, letterSpacing: 3, cursor: saving ? "wait" : "pointer" }}>
        {saving ? "SAVING…" : saved ? "✓ SAVED" : "SAVE CHANGES"}
      </button>
    </div>
  );
}

function SectionCard({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 20px", ...style }}>
      <div style={{ fontFamily: FONT.body, fontSize: 10, fontWeight: 700, letterSpacing: 3, color: C.muted, marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
      <div className="display" style={{ fontSize: 16, color: C.text }}>{value}</div>
      <div style={{ fontFamily: FONT.body, fontSize: 9, color: C.muted, letterSpacing: 2 }}>{label}</div>
    </div>
  );
}
