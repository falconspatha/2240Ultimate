import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Food Donation Ops Dashboard",
  description: "Operations dashboard for food donation, storage, and delivery",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
