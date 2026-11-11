// app/page.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { HomeScreen } from "@/screens/HomeScreen";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";
import { C, FONT, NAV_ITEMS, GLOBAL_CSS } from "@/lib/constants";
import type { ScreenId } from "@/types";

const RaceScreen = dynamic(
  () => import("@/screens/RaceScreen").then((mod) => mod.RaceScreen),
  { loading: () => <ScreenLoader label="LOADING RACE…" /> },
);
const LeaderboardScreen = dynamic(
  () => import("@/screens/LeaderboardScreen").then((mod) => mod.LeaderboardScreen),
  { loading: () => <ScreenLoader label="LOADING BOARD…" /> },
);
const HistoryScreen = dynamic(
  () => import("@/screens/HistoryScreen").then((mod) => mod.HistoryScreen),
  { loading: () => <ScreenLoader label="LOADING HISTORY…" /> },
);
const ExploreScreen = dynamic(
  () => import("@/screens/ExploreScreen").then((mod) => mod.ExploreScreen),
  { loading: () => <ScreenLoader label="LOADING RACERS…" /> },
);
const ProfileScreen = dynamic(
  () => import("@/screens/ProfileScreen").then((mod) => mod.ProfileScreen),
  { loading: () => <ScreenLoader label="LOADING PROFILE…" /> },
);
const LiveDataScreen = dynamic(
  () => import("@/screens/LiveDataScreen").then((mod) => mod.LiveDataScreen),
  { loading: () => <ScreenLoader label="LOADING LIVE DATA…" /> },
);
const AdminPanel = dynamic(
  () => import("@/screens/AdminPanel").then((mod) => mod.AdminPanel),
  { loading: () => <ScreenLoader label="LOADING ADMIN…" /> },
);

const RESPONSIVE_CSS = `
  :root { color-scheme: dark; }
  html { background: #0b0c0e; }
  body { min-width: 320px; background: radial-gradient(ellipse at 62% -20%, rgba(232,53,10,.12), transparent 42%), #0b0c0e; }
  button, input, textarea { font: inherit; }
  button:focus-visible, input:focus-visible, textarea:focus-visible { outline: 2px solid ${C.accent}; outline-offset: 3px; }
  .ra-shell { width: 100%; max-width: 1480px; min-height: 100vh; margin: 0 auto; display: flex; flex-direction: column; position: relative; background: rgba(11,12,14,.84); border-left: 1px solid rgba(255,255,255,.035); border-right: 1px solid rgba(255,255,255,.035); }
  .ra-header { min-height: 78px; display: flex; justify-content: space-between; align-items: center; gap: 18px; padding: 16px clamp(18px,5vw,70px); background: rgba(11,12,14,.88); backdrop-filter: blur(18px); position: sticky; top: 0; z-index: 40; border-bottom: 1px solid rgba(255,255,255,.07); }
  .ra-brand { display:flex; align-items:center; width:184px; height:58px; }
  .ra-logo { display:block; width:100%; height:100%; object-fit:contain; mix-blend-mode:screen; }
  .ra-nav { order: 1; display: flex; gap: 4px; padding: 0 clamp(12px,5vw,70px); background: rgba(11,12,14,.94); border-bottom: 1px solid rgba(255,255,255,.07); z-index: 35; }
  .ra-nav-button { flex: 1; min-height: 62px; padding: 9px 12px 11px; border: 0; border-bottom: 2px solid transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 9px; color: ${C.muted}; transition: color .2s ease,border-color .2s ease,background .2s ease; }
  .ra-nav-button:hover { color: ${C.text}; background: rgba(255,255,255,.025); }
  .ra-nav-button svg { width: 17px; height: 17px; }
  .ra-main { order: 2; flex: 1; overflow-x: hidden; padding-bottom: 0; }
  .ra-main--full { padding-bottom: 0; }
  .ra-content { min-height: 100%; width: 100%; max-width: 1320px; margin: 0 auto; padding: 36px clamp(18px,5vw,70px) 72px; }
  .ra-content--full { max-width: none; padding: 0; }
  .ra-kicker { color: ${C.accent}; font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; }
  .ra-title { margin-top: 8px; color: ${C.text}; font-family: ${FONT.display}; font-size: clamp(38px,7vw,72px); font-weight: 400; line-height: .9; letter-spacing: .5px; }
  .ra-card { background: linear-gradient(145deg,rgba(255,255,255,.045),rgba(255,255,255,.015)); border: 1px solid rgba(255,255,255,.09); border-radius: 20px; box-shadow: 0 18px 48px rgba(0,0,0,.2); }
  .ra-label { color: ${C.muted}; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; }
  .ra-nav-button span { font-size: 10px !important; letter-spacing: 2px !important; }
  .ra-main h2.display { font-size: clamp(36px,5vw,58px) !important; line-height: .95; letter-spacing: .5px !important; }
  .race-setup { width: 100%; }
  .race-hero { display: grid; grid-template-columns: 1.05fr .95fr; min-height: 310px; overflow: hidden; border: 1px solid rgba(255,255,255,.09); border-radius: 24px; background: #121315; box-shadow: 0 24px 72px rgba(0,0,0,.26); }
  .race-hero-copy { padding: clamp(28px,5vw,62px); align-self: center; position: relative; z-index: 1; }
  .race-hero-title { margin: 12px 0 16px; color: ${C.text}; font-family: ${FONT.display}; font-size: clamp(44px,7vw,78px); font-weight: 400; line-height: .88; letter-spacing: .3px; }
  .race-hero-title em { color: ${C.accent}; font-style: normal; }
  .race-hero-copy p { max-width: 470px; color: #aaa9ad; font-size: 16px; line-height: 1.45; }
  .race-hero-meta { display:flex; align-items:center; gap:9px; margin-top:24px; color:#85858c; font-size:9px; font-weight:700; letter-spacing:1.7px; }
  .live-dot,.gps-dot { display:inline-block; width:7px; height:7px; border-radius:50%; background:${C.accent}; box-shadow:0 0 12px ${C.accent}90; }
  .race-hero-divider { width:24px; height:1px; margin:0 4px; background:#55545a; }
  .race-hero-art { min-height:310px; position:relative; background-image:linear-gradient(90deg,#121315 0%,rgba(18,19,21,.45) 32%,rgba(18,19,21,.05) 100%),linear-gradient(0deg,rgba(11,12,14,.5),transparent 46%),url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85'); background-size:cover; background-position:center 52%; }
  .race-hero-art:after { content:""; position:absolute; inset:0; background:linear-gradient(135deg,transparent 56%,rgba(232,53,10,.22)); mix-blend-mode:screen; }
  .hero-mark { position:absolute; right:8%; top:5%; color:rgba(255,255,255,.12); font-family:${FONT.display}; font-size:clamp(90px,16vw,200px); line-height:1; letter-spacing:-10px; }
  .hero-caption { position:absolute; right:24px; bottom:20px; z-index:1; color:rgba(255,255,255,.62); font:700 9px ${FONT.mono}; letter-spacing:2px; }
  .race-workspace { display:grid; grid-template-columns:minmax(0,1.25fr) minmax(290px,.75fr); gap:18px; align-items:start; margin-top:18px; }
  .race-config { padding:clamp(20px,3vw,34px); }
  .race-config-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:26px; }
  .race-config-heading h2 { margin-top:6px; color:${C.text}; font-family:${FONT.display}; font-size:34px; font-weight:400; line-height:1; }
  .gps-pill { display:flex; align-items:center; gap:8px; color:#a3a3a8; font:700 9px ${FONT.body}; letter-spacing:1.5px; border:1px solid rgba(255,255,255,.1); border-radius:99px; padding:9px 12px; white-space:nowrap; }
  .gps-dot { width:6px; height:6px; background:#f1a64a; box-shadow:0 0 10px #f1a64a75; }
  .gps-dot.is-ready { background:#50c98b; box-shadow:0 0 10px #50c98b75; }
  .race-type-switch { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:10px 0 24px; }
  .race-type-option { min-height:82px; display:flex; align-items:center; gap:12px; text-align:left; padding:13px; border:1px solid rgba(255,255,255,.09); border-radius:14px; background:rgba(255,255,255,.025); color:${C.text}; cursor:pointer; transition:.2s ease; }
  .race-type-option:hover { border-color:rgba(255,255,255,.22); }
  .race-type-option.is-selected { background:rgba(232,53,10,.08); border-color:${C.accent}; box-shadow:inset 0 0 0 1px ${C.accent}22; }
  .type-icon { width:34px; height:34px; flex:0 0 34px; display:grid; place-items:center; border:1px solid rgba(255,255,255,.11); border-radius:10px; color:${C.accent}; font-size:20px; }
  .race-type-option strong,.race-type-option small,.privacy-row strong,.privacy-row small { display:block; }
  .race-type-option strong { font-size:14px; font-weight:700; }
  .race-type-option small { margin-top:4px; color:#8a8990; font-size:11px; line-height:1.2; }
  .type-arrow { margin-left:auto; color:${C.accent}; font-size:16px; }
  .distance-config,.sprint-config { padding-top:18px; border-top:1px solid rgba(255,255,255,.075); }
  .distance-presets,.sprint-options { display:flex; flex-wrap:wrap; gap:8px; margin:11px 0 12px; }
  .distance-chip,.sprint-chip,.unit-option { border:1px solid rgba(255,255,255,.1); background:rgba(255,255,255,.025); color:#b9b8bd; cursor:pointer; transition:.2s ease; }
  .distance-chip { min-width:76px; padding:10px 13px; border-radius:11px; font:26px ${FONT.display}; }
  .distance-chip small { margin-left:4px; color:#8f8e94; font:700 9px ${FONT.body}; text-transform:uppercase; }
  .distance-chip.is-selected,.sprint-chip.is-selected,.unit-option.is-selected { border-color:${C.accent}; background:rgba(232,53,10,.12); color:${C.text}; }
  .sprint-chip { padding:9px 12px; border-radius:9px; font:700 12px ${FONT.body}; }
  .custom-distance { display:flex; align-items:center; justify-content:space-between; gap:12px; color:#aaa9ad; font-size:12px; }
  .custom-distance span { display:flex; align-items:center; gap:8px; }
  .custom-distance input { width:82px; padding:9px 10px; border:1px solid rgba(255,255,255,.12); border-radius:9px; background:#101113; color:${C.text}; font:700 15px ${FONT.mono}; }
  .custom-distance b { color:#8c8b91; font-size:9px; letter-spacing:1px; }
  .config-hint { min-height:28px; margin-top:12px; color:#85848b; font-size:12px; line-height:1.45; }
  .config-bottom-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-top:22px; padding-top:18px; border-top:1px solid rgba(255,255,255,.075); }
  .unit-control > div { display:flex; gap:6px; margin-top:9px; }
  .unit-option { flex:1; padding:8px 10px; border-radius:8px; font:700 12px ${FONT.body}; }
  .privacy-row { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:17px 0; margin-top:17px; border-top:1px solid rgba(255,255,255,.075); }
  .privacy-row strong { color:#e5e3e0; font-size:13px; }
  .privacy-row small { margin-top:3px; color:#85848b; font-size:11px; }
  .privacy-switch { width:40px; height:23px; padding:3px; border:0; border-radius:99px; background:#34343b; cursor:pointer; transition:.2s; }
  .privacy-switch i { display:block; width:17px; height:17px; border-radius:50%; background:#b5b4b8; transition:.2s; }
  .privacy-switch.is-on { background:${C.accent}; }
  .privacy-switch.is-on i { transform:translateX(17px); background:white; }
  .start-run-button { width:100%; min-height:54px; display:flex; align-items:center; justify-content:space-between; padding:0 18px; border:0; border-radius:11px; background:${C.accent}; color:white; font:400 19px ${FONT.display}; letter-spacing:1.5px; cursor:pointer; transition:.2s; }
  .start-run-button:hover:not(:disabled) { background:#f0593b; transform:translateY(-1px); box-shadow:0 10px 28px ${C.accent}35; }
  .start-run-button:disabled { background:#38383d; color:#85848b; cursor:wait; }
  .start-run-button b { font:20px ${FONT.body}; }
  .gps-message { margin-top:9px; color:#8c8b92; text-align:center; font-size:11px; }
  .gps-message.has-error { color:#edb262; }
  .race-side-panel { display:flex; flex-direction:column; gap:14px; }
  .session-preview { overflow:hidden; border:1px solid rgba(255,255,255,.09); border-radius:19px; background:#121315; }
  .preview-topline,.preview-footer { display:flex; align-items:center; justify-content:space-between; padding:16px 18px; color:#8f8e94; font:700 9px ${FONT.body}; letter-spacing:1.5px; }
  .preview-topline { border-bottom:1px solid rgba(255,255,255,.07); }
  .preview-track { height:210px; position:relative; overflow:hidden; background:radial-gradient(ellipse at 52% 55%,rgba(232,53,10,.09),transparent 62%); }
  .track-grid { position:absolute; inset:0; opacity:.21; background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px); background-size:32px 32px; mask-image:linear-gradient(transparent,#000 20%,#000 80%,transparent); }
  .preview-track svg { position:absolute; inset:0; width:100%; height:100%; padding:10px; }
  .track-km { position:absolute; padding:4px 7px; border:1px solid rgba(255,255,255,.16); border-radius:5px; background:#17181a; color:#aaa9ad; font:700 8px ${FONT.mono}; letter-spacing:1px; }
  .track-km-start { left:12px; bottom:24px; }.track-km-end { right:12px; top:21px; color:#f06b50; border-color:${C.accent}55; }
  .preview-footer { border-top:1px solid rgba(255,255,255,.07); align-items:flex-end; }
  .preview-footer small,.preview-footer strong { display:block; }
  .preview-footer small { margin-bottom:5px; color:#77767d; font-size:8px; }
  .preview-footer strong { color:${C.text}; font:20px ${FONT.display}; letter-spacing:.5px; }
  .preview-footer > span { color:#69bd8c; font-size:8px; }
  .stat-teaser { padding:20px; border:1px solid rgba(255,255,255,.08); border-radius:17px; background:linear-gradient(135deg,rgba(232,53,10,.08),rgba(255,255,255,.02)); }
  .teaser-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px 10px; margin-top:15px; }
  .teaser-grid strong,.teaser-grid span { display:block; }
  .teaser-grid strong { color:${C.accent}; font:21px ${FONT.display}; }
  .teaser-grid span { margin-top:2px; color:#b2b1b6; font-size:11px; }
  .safety-note { display:flex; gap:10px; align-items:flex-start; padding:0 4px; color:#85848b; }
  .safety-note > span { width:16px; height:16px; flex:0 0 16px; display:grid; place-items:center; border:1px solid #55545a; border-radius:50%; font:10px ${FONT.mono}; }
  .safety-note p { font-size:11px; line-height:1.5; }
  .race-active { width:100%; min-height:calc(100vh - 190px) !important; overflow:visible !important; border:1px solid rgba(255,255,255,.08); border-radius:22px; background:radial-gradient(ellipse at 50% 0%,rgba(232,53,10,.1),transparent 34%),#101113 !important; }
  .ranks-page { max-width:900px; margin:0 auto; }
  .ranks-heading { margin-bottom:24px; }
  .ranks-heading .ra-title span { color:${C.accent}; }
  .ranks-heading p { margin-top:12px; color:#aaa9ad; font-size:14px; }
  .ranks-mode-list { display:flex; gap:8px; overflow:auto; padding:2px 0 13px; scrollbar-width:none; }
  .ranks-mode-list::-webkit-scrollbar { display:none; }
  .ranks-mode { flex:0 0 auto; padding:10px 14px; border:1px solid rgba(255,255,255,.1); border-radius:99px; background:rgba(255,255,255,.025); color:#9a999f; font:700 10px ${FONT.body}; letter-spacing:1.1px; cursor:pointer; transition:.2s; }
  .ranks-mode:hover { color:${C.text}; border-color:rgba(255,255,255,.25); }
  .ranks-mode.is-selected { color:${C.text}; border-color:${C.accent}; background:rgba(232,53,10,.11); }
  .ranks-results-heading { display:flex; align-items:center; justify-content:space-between; margin:13px 0 12px; padding-top:18px; border-top:1px solid rgba(255,255,255,.08); color:${C.text}; font:22px ${FONT.display}; letter-spacing:.7px; }
  .ranks-results-heading span:last-child { color:#818087; font:700 9px ${FONT.body}; letter-spacing:1.5px; }
  .ranks-footnote { display:flex; gap:10px; align-items:center; margin-top:22px; padding:13px 15px; border:1px solid rgba(255,255,255,.07); border-radius:11px; color:#85848b; font-size:11px; }
  .ranks-footnote > span:first-child { color:${C.accent}; font-size:16px; }
  .ranks-page > div[style*="text-align: center"] { padding:42px 18px !important; border:1px solid rgba(255,255,255,.08); border-radius:16px; background:rgba(255,255,255,.02); }
  .ranks-page > div[style*="text-align: center"] > div:first-child { margin-bottom:12px !important; color:${C.accent} !important; font:36px ${FONT.display} !important; }
  .ranks-page > div[style*="text-align: center"] > div:nth-child(2) { color:${C.text} !important; font-size:24px !important; letter-spacing:.5px !important; }
  .ranks-page > div[style*="text-align: center"] > div:nth-child(3) { margin:0 auto; max-width:350px; color:#96959b !important; font-size:13px !important; }
  .profile-page { max-width:860px; margin:0 auto; }
  .profile-page > div:first-child { display:grid !important; grid-template-columns:auto 1fr; justify-items:start !important; align-items:center; column-gap:22px; text-align:left !important; padding:26px; margin-bottom:16px !important; border:1px solid rgba(255,255,255,.08); border-radius:18px; background:linear-gradient(130deg,rgba(232,53,10,.075),rgba(255,255,255,.018)); }
  .profile-page > div:first-child > button { grid-row:span 2; margin:0 !important; }
  .profile-page > div:first-child h2 { margin:0 !important; }
  .profile-page > div:first-child p { grid-column:2; margin-top:4px; }
  .profile-page > div:nth-child(3) { margin-bottom:16px !important; }
  .profile-page > div:nth-child(3) > div,.profile-page section,.profile-page > div[style*="background: rgb"] { border-color:rgba(255,255,255,.08) !important; border-radius:14px !important; }
  @media(max-width:900px) { .race-hero { grid-template-columns:1fr .72fr; }.race-workspace { grid-template-columns:1fr; }.race-side-panel { display:grid; grid-template-columns:1fr 1fr; }.safety-note { grid-column:1/-1; } }
  @media(max-width:700px) {
    .ra-shell { border: 0; padding-bottom: calc(72px + env(safe-area-inset-bottom)); }
    .ra-header { min-height: 64px; padding: 5px 18px; }
    .ra-brand { width:144px; height:52px; }
    .ra-nav { position: fixed; order: 3; bottom: 0; left: 0; width: 100%; padding: 4px 14px calc(4px + env(safe-area-inset-bottom)); border-top: 1px solid rgba(255,255,255,.1); border-bottom: 0; background: rgba(13,14,16,.96); backdrop-filter: blur(20px); }
    .ra-nav-button { min-height: 58px; flex-direction: column; gap: 4px; border-bottom: 0; border-top: 2px solid transparent; padding: 4px; }
    .ra-nav-button span { font-size: 9px !important; letter-spacing: 1.5px !important; }
    .ra-nav-button svg { width: 19px; height: 19px; }
    .ra-main { padding-bottom: 0; }
    .ra-content { padding: 28px 18px 42px; }
    .race-hero { min-height:0; grid-template-columns:1fr; border-radius:18px; }
    .race-hero-copy { padding:28px 22px 20px; }
    .race-hero-title { font-size:54px; }
    .race-hero-copy p { font-size:14px; }
    .race-hero-art { min-height:165px; background-position:center 48%; background-image:linear-gradient(0deg,#121315 0%,rgba(18,19,21,.08) 75%),url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80'); }
    .race-hero-art .hero-mark { font-size:106px; }
    .race-workspace { gap:13px; margin-top:13px; }
    .race-config { padding:20px 16px; border-radius:17px; }
    .race-config-heading { align-items:flex-start; margin-bottom:21px; }
    .race-config-heading h2 { font-size:30px; }
    .gps-pill { padding:8px 9px; font-size:8px; }
    .race-type-switch { grid-template-columns:1fr; gap:8px; margin-bottom:20px; }
    .race-type-option { min-height:68px; padding:10px; }
    .config-bottom-row { gap:10px; }
    .race-side-panel { grid-template-columns:1fr; }
    .preview-track { height:180px; }
    .stat-teaser { padding:17px; }
    .safety-note { grid-column:auto; }
    .race-active { min-height:calc(100vh - 178px) !important; border-radius:14px; }
    .profile-page > div:first-child { grid-template-columns:auto 1fr; padding:18px 14px; column-gap:13px; }
    .profile-page > div:first-child > button { width:70px !important; height:70px !important; font-size:28px !important; }
    .profile-page > div:first-child h2 { font-size:21px !important; }
  }
  @media(min-width:701px) {
    .ra-main--full { padding-bottom: 0; }
  }
`;

const screenVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const FULL_SCREEN_IDS = new Set<ScreenId>(["admin"]);

function ScreenLoader({ label }: { label: string }) {
  return (
    <div style={{ minHeight: "60vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", border: `3px solid ${C.border}`, borderTop: `3px solid ${C.accent}`, animation: "spin-slow 0.8s linear infinite" }} />
      <span style={{ fontFamily: FONT.body, fontWeight: 700, fontSize: 11, letterSpacing: 3, color: C.muted }}>{label}</span>
    </div>
  );
}

function AuthRequired({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useSession();

  if (isLoading) return <ScreenLoader label="LOADING…" />;

  if (!isAuthenticated) {
    window.location.href = "/auth/signin?redirectTo=/";
    return null;
  }

  return <>{children}</>;
}

export default function App() {
  const [screen, setScreen] = useState<ScreenId>("raceScreen");
  const [isGuest, setIsGuest] = useState(false);
  const { isAuthenticated } = useSession();
  const { profile } = useProfile();

  useEffect(() => {
    setIsGuest(window.sessionStorage.getItem("redline:guestMode") === "true");
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    window.sessionStorage.removeItem("redline:guestMode");
    setIsGuest(false);
  }, [isAuthenticated]);

  const isAdmin = (profile as any)?.role === "admin";

  const navigate = useCallback((dest: ScreenId) => {
    const authRequired: ScreenId[] = ["history", "profile"];

    if (dest === "admin" && !isAdmin) return;

    if (authRequired.includes(dest) && !isAuthenticated) {
      window.location.href = "/auth/signin?redirectTo=/";
      return;
    }
    setScreen(dest);
  }, [isAuthenticated, isAdmin]);

  const hideNav = FULL_SCREEN_IDS.has(screen);

  return (
    <>
      <style>{`${GLOBAL_CSS}\n${RESPONSIVE_CSS}`}</style>
      <div className="ra-shell">
        {!hideNav && (
          <header className="ra-header">
            <button onClick={() => setScreen("raceScreen")} className="ra-brand" style={{ border: 0, padding: 0, background: "transparent", cursor: "pointer" }} aria-label="Redline home">
              <img className="ra-logo" src="/redline-logo.jpg" alt="Redline" />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isAdmin && (
                <button
                  onClick={() => setScreen("admin")}
                  style={{ background: "none", border: `1px solid ${C.accent}`, borderRadius: 8, padding: "7px 14px", color: C.accent, cursor: "pointer", fontFamily: FONT.body, fontWeight: 700, fontSize: 11, letterSpacing: 2 }}
                >
                  ADMIN
                </button>
              )}

              {!isAuthenticated && (
                <button
                  onClick={() => window.location.href = "/auth/signin"}
                  style={{ background: C.accent, border: "none", borderRadius: 8, padding: "8px 16px", color: C.white, cursor: "pointer", fontFamily: FONT.display, fontSize: 14, letterSpacing: 3 }}
                >
                  SIGN IN
                </button>
              )}
            </div>
          </header>
        )}

        {!hideNav && (
          <nav className="ra-nav">
            {(NAV_ITEMS as unknown as { id: string; label: string }[]).map((item) => {
              const active = screen === item.id || (item.id === "race" && (screen === "raceScreen" || screen === "home"));
              const dest = item.id === "race" ? "raceScreen" : item.id as ScreenId;

              return (
                <button
                  key={item.id}
                  className="ra-nav-button"
                  onClick={() => navigate(dest)}
                  style={{
                    background: "transparent",
                    borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent",
                    color: active ? C.text : C.muted,
                  }}
                >
                  <NavIcon id={item.id} />
                  <span style={{ fontFamily: FONT.body, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: "inherit" }}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        )}

        <main className={hideNav ? "ra-main ra-main--full" : "ra-main"}>
          <div className={hideNav ? "ra-content ra-content--full" : "ra-content"}>
            <AnimatePresence mode="wait">
              <motion.div
                key={screen}
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
                style={{ minHeight: "100%" }}
              >
                {screen === "home" && <HomeScreen onNavigate={navigate} />}
                {screen === "board" && <LeaderboardScreen />}
                {screen === "explore" && <ExploreScreen />}
                {screen === "liveData" && <LiveDataScreen />}

                {(screen === "raceScreen" || screen === "race") && <RaceScreen onExit={navigate} isGuest={isGuest} />}

                {screen === "history" && (
                  <AuthRequired>
                    <HistoryScreen />
                  </AuthRequired>
                )}

                {screen === "profile" && (
                  <AuthRequired>
                    <ProfileScreen />
                  </AuthRequired>
                )}

                {screen === "admin" && isAdmin && <AdminPanel onBack={navigate} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </>
  );
}

function NavIcon({ id }: { id: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (id === "race") return <svg {...common}><path d="M5 21V4m0 1c6-4 8 4 14 0v10c-6 4-8-4-14 0" /></svg>;
  if (id === "board") return <svg {...common}><path d="M4 20v-6m8 6V4m8 16V9M2 20h20" /></svg>;
  return <svg {...common}><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>;
}
