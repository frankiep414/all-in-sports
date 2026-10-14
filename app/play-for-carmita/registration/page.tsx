import { redirect } from 'next/navigation';
export default async function Page({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const params = await searchParams;
  const type = params.type === 'team' ? 'team' : 'individual';
  redirect(`/play-for-carmita?type=${type}#register`);
}
