import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HKUST Notes Trading Platform",
  description: "Secure note trading platform for HKUST students",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}