import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'UniHood | Boarding & neighborhood discovery', description: 'Privacy-aware student accommodation and neighborhood discovery. Development preview.' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
