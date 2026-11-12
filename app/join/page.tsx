import { redirect } from 'next/navigation';

export default function JoinPage() {
  redirect('/?auth=1&returnTo=%2Fplay');
}
