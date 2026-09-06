import { redirect } from 'next/navigation';

export default function LoginPage() {
  redirect('/me?auth=login');
}
