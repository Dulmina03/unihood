import type { Metadata } from 'next';
import '@fontsource/fraunces/latin-500.css';
import '@fontsource/fraunces/latin-400-italic.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-600.css';
import '@fontsource/manrope/latin-700.css';
import '@fontsource/manrope/latin-800.css';
import './globals.css';
import './landing.css';
import 'maplibre-gl/dist/maplibre-gl.css';
import './explore.css';
import './favourites.css';
export const metadata: Metadata = { title: 'UniHood | Boarding & neighborhood discovery', description: 'Privacy-aware student accommodation and neighborhood discovery. Development preview.' };
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
