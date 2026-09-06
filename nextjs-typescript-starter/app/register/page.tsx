import { redirect } from 'next/navigation';

export default function RegisterPage() {
  redirect('/me?auth=register');
}
