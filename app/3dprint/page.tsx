import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { isOfficer } from '@/lib/roles';

import { Print3dConsole } from '@/components/print3d-console';

export const dynamic = 'force-dynamic';

export default async function Print3dPage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  if (!isOfficer(user)) {
    redirect('/login?error=forbidden');
  }

  return <Print3dConsole user={user} />;
}
