import { AppShell } from '@/components/app-shell';
import { SettingsPanel } from '@/components/settings-panel';

export default function Page() {
  return (
    <AppShell>
      <SettingsPanel />
    </AppShell>
  );
}
