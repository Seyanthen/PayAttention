import AppTabs from '@/components/app-tabs';
import { Redirect } from 'expo-router';
import { isAuthenticated } from '@/services/auth';

export default function AppLayout() {
  if (!isAuthenticated()) {
    return <Redirect href="/login" />;
  }

  return <AppTabs />;
}
