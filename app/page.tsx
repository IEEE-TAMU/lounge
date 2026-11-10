import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { isOfficer } from '@/lib/roles';

import { Player } from '@/components/player';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  return <Player user={user} canControl={isOfficer(user)} />;
}
