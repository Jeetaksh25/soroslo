import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "SoroSLO",
  description: "Synthetic reliability monitoring for Stellar and Soroban"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href="/" className="brand">
            <span className="brand-mark">S</span>
            <span>
              <strong>SoroSLO</strong>
              <small>Stellar reliability monitor</small>
            </span>
          </Link>
          <nav>
            <Link href="/">Overview</Link>
            <Link href="/incidents">Incidents</Link>
          </nav>
        </header>
        <main className="shell">{children}</main>
      </body>
    </html>
  );
}
