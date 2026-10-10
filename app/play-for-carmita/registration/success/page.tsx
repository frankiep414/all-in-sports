import Link from 'next/link';
export default function Page() {
  return <main className="carmitaPage" style={{ minHeight: '100vh', padding: '90px 24px', textAlign: 'center' }}>
    <h1>THANK YOU FOR SUPPORTING CARMITA!</h1>
    <p>Payment confirmation will be sent by Stripe if your payment was successful. Please retain your receipt.</p>
    <Link href="/play-for-carmita">BACK TO EVENT</Link>
  </main>;
}
