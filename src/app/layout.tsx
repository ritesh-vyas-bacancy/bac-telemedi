import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BAC Telemedicine | Enterprise Virtual Care",
  description: "Enterprise telemedicine platform for patient, provider, and admin operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased selection:bg-cyan-200/70">{children}</body>
    </html>
  );
}
