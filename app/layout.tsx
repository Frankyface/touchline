import type { Metadata } from "next";
import "./globals.css";
import "./workspace.css";

export const metadata: Metadata = {
  title: "Touchline — Your rugby notebook",
  description:
    "Draw the idea. See the movement. Take it to the pitch. Your personal rugby playbook and session planner.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
