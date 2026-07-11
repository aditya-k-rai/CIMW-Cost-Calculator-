import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cost Calculator",
  description: "Construction, modular kitchen, interior, and wardrobe cost calculator."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
