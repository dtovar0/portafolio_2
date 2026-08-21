import { AppShell } from '@/components/app-shell';
import { UsersList } from '@/components/users-list';

export default function Page() {
  return (
    <AppShell>
      <UsersList />
    </AppShell>
  );
}
