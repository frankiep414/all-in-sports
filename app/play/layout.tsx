import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.allinsportsnj.com'),
  title: 'All In Sports | Find Your Next Game',
  description: 'Join pickup soccer games, compete, track your stats and ratings, and build your All In Sports legacy.',
  alternates: { canonical: '/play' },
  openGraph: {
    type: 'website',
    url: 'https://www.allinsportsnj.com/play',
    siteName: 'All In Sports',
    title: 'All In Sports | Find Your Next Game',
    description: 'Join pickup soccer games, compete, track your stats and ratings, and build your All In Sports legacy.',
    images: [{ url: '/all-in-sports-future.png', alt: 'All In Sports' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'All In Sports | Find Your Next Game',
    description: 'Join pickup soccer games, compete, track your stats and ratings, and build your All In Sports legacy.',
    images: ['/all-in-sports-future.png'],
  },
};

export default function PlayLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
