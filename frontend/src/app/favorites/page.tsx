import { AppShell } from '@/components/app-shell';
import { FavoritesList } from '@/components/favorites-list';

export default function Page() {
  return (
    <AppShell>
      <FavoritesList />
    </AppShell>
  );
}
