'use client';

import type { FormEvent } from 'react';
import { signOutAction } from 'app/actions/auth';

export function SignOutForm({ compact = false }: { compact?: boolean }) {
  const confirmSignOut = (event: FormEvent<HTMLFormElement>) => {
    if (!window.confirm('确定退出登录吗？')) event.preventDefault();
  };

  return (
    <form action={signOutAction} onSubmit={confirmSignOut} className={compact ? undefined : 'mt-8'}>
      <button type="submit" className={compact ? undefined : 'h-12 w-full rounded-2xl border border-rose-200 bg-white font-semibold text-rose-600 transition hover:bg-rose-50'}>
        退出登录
      </button>
    </form>
  );
}
