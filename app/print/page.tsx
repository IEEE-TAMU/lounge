import { redirect } from 'next/navigation';

import { getSession } from '@/lib/auth';
import { isOfficer } from '@/lib/roles';

import { PrintConsole } from '@/components/print-console';

export const dynamic = 'force-dynamic';

export default async function PrintPage() {
  const user = await getSession();

  if (!user) {
    redirect('/login');
  }

  if (!isOfficer(user)) {
    redirect('/login?error=forbidden');
  }

  return <PrintConsole user={user} />;
}
