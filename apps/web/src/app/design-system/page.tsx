import type { Metadata } from 'next';
import Showcase from '../../components/design-system/showcase';
import './showcase.css';

export const metadata: Metadata = {
  title: 'Campus Teal | UniHood design system',
  description: 'A component demonstration with explicitly synthetic content; no live boarding listings.',
  robots: {index: false, follow: false},
};
export default function DesignSystemPage() { return <Showcase />; }
