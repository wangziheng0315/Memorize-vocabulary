import './globals.css';

import { GeistSans } from 'geist/font/sans';
import { BottomTabs } from 'app/components/bottom-tabs';

let title = 'Word Flow · 学英语单词';
let description = '按单词书循序学习，随时从上次的进度继续。';

export const metadata = {
  title,
  description,
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={`${GeistSans.variable} bg-slate-50 text-slate-950 antialiased`}>
        {children}
        <BottomTabs />
      </body>
    </html>
  );
}
