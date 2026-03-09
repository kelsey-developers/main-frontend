import { redirect } from 'next/navigation';

/** /home redirects to / (home is now the index). */
export default function HomeRedirect() {
  redirect('/');
}
