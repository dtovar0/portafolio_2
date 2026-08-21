import { AppShell } from '@/components/app-shell';
import { NotificationsList } from '@/components/notifications-list';

export default function Page() {
  return (
    <AppShell>
      <NotificationsList />
    </AppShell>
  );
}
