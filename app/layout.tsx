import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://racers-arenaa-beta.vercel.app"),
  title: {
    default: "Redline — Drive. Track. Rise.",
    template: "%s | Redline",
  },
  description: "Track every drive, follow your performance, and climb the Redline ranks.",
  applicationName: "Redline",
  keywords: ["Redline", "racing", "0-100", "0-200", "quarter mile", "top speed", "leaderboard"],
  openGraph: {
    type: "website",
    siteName: "Redline",
    title: "Redline — Drive. Track. Rise.",
    description: "Track every drive, follow your performance, and climb the Redline ranks.",
    images: [{ url: "/redline-logo.jpg", width: 1280, height: 480, alt: "Redline" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Redline — Drive. Track. Rise.",
    description: "Track every drive, follow your performance, and climb the Redline ranks.",
    images: ["/redline-logo.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
