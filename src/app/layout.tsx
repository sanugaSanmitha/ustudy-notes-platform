import type { Metadata } from 'next';
import { Hanken_Grotesk, Inter } from 'next/font/google';
import { Providers } from '@/components/i18n/Providers';
import { getMessage } from '@/lib/i18n/messages';
import { getServerLocale } from '@/lib/i18n/server-locale';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const hanken = Hanken_Grotesk({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-hanken',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: getMessage(locale, 'metaTitle'),
    description: getMessage(locale, 'metaDescription'),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getServerLocale();

  return (
    <html lang={locale === 'zh-CN' ? 'zh-CN' : 'en'}>
      <body className={`${inter.variable} ${hanken.variable} font-sans antialiased`}>
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
