import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';

import { LoginCard } from '@/components/login-card';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSession();
  if (user) redirect('/');

  const { error } = await searchParams;

  return <LoginCard error={error} />;
}
