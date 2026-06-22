
import type { Metadata } from "next";
import { getMessages } from 'next-intl/server';
import { NextIntlClientProvider } from 'next-intl';
import "./globals.css";

export const metadata: Metadata = {
  title: "HKUST Notes Trading Platform",
  description: "Secure note trading platform for HKUST students",
};

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params?: { locale?: string };
}) {
  const locale = params?.locale ?? 'en';
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
