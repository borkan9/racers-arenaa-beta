import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://racers-arenaa-beta.vercel.app"),
  title: {
    default: "Racers Arena Beta",
    template: "%s | Racers Arena",
  },
  description: "Track your runs, compare performance, and compete on weekly racing leaderboards with Racers Arena.",
  applicationName: "Racers Arena",
  keywords: ["Racers Arena", "racing", "0-100", "0-200", "quarter mile", "top speed", "leaderboard"],
  openGraph: {
    type: "website",
    siteName: "Racers Arena",
    title: "Racers Arena Beta",
    description: "Track your runs, compare performance, and compete on weekly racing leaderboards.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Racers Arena Beta",
    description: "Track your runs, compare performance, and compete on weekly racing leaderboards.",
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
