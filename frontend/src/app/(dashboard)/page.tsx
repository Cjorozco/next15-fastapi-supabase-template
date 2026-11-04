import { redirect } from 'next/navigation';

/** "Hoy" is the first screen of the app; the dashboard lives in /dashboard. */
export default function HomePage() {
  redirect('/hoy');
}
