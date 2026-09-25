import './globals.css';

export const metadata = {
  title: 'All In Sports',
  description: 'Play. Compete. Connect.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
