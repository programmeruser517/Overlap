import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Overlap",
  description: "Schedule meetings or draft emails without back-and-forth. Say what you want, see the plan, approve it.",
  icons: {
    icon: "/overlap_blue.png",
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
