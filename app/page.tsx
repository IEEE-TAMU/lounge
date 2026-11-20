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

  if (!isOfficer(user)) {
    redirect('/login?error=forbidden');
  }

  return <Player user={user} />;
}
