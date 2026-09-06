'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';
import { loginAction, registerAction, type AuthFormState } from 'app/actions/auth';

const emptyState: AuthFormState = {};

function AuthSubmitButton({ mode }: { mode: 'login' | 'register' }) {
  const { pending } = useFormStatus();
  const label = mode === 'login' ? '登录' : '注册';

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
    >
      {pending ? '处理中…' : label}
    </button>
  );
}

export function AuthModal({ initialMode, returnTo }: { initialMode: 'login' | 'register'; returnTo: string }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [loginState, loginFormAction] = useFormState(loginAction, emptyState);
  const [registerState, registerFormAction] = useFormState(registerAction, emptyState);
  const dialogRef = useRef<HTMLElement | null>(null);
  const state = mode === 'login' ? loginState : registerState;
  const formAction = mode === 'login' ? loginFormAction : registerFormAction;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const autofocus = dialog?.querySelector<HTMLElement>('[autofocus]');
    autofocus?.focus();

    const closeOnEscapeAndTrapFocus = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        router.replace('/me');
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', closeOnEscapeAndTrapFocus);
    return () => {
      document.removeEventListener('keydown', closeOnEscapeAndTrapFocus);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [router]);

  const close = () => router.replace('/me');
  const title = mode === 'login' ? '登录后继续学习' : '注册账号';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={close}>
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="auth-modal-title" className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">用邮箱同步你的学习进度</p>
          </div>
          <button type="button" aria-label="关闭登录弹窗" onClick={close} className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button>
        </div>

        <form action={formAction} className="mt-6 space-y-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="block text-sm font-medium text-slate-700">
            邮箱
            <input autoFocus name="email" type="email" autoComplete="email" required placeholder="you@example.com" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            密码
            <input name="password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={6} required className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </label>
          {state.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
          <AuthSubmitButton mode={mode} />
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="ml-1 font-semibold text-indigo-600 hover:text-indigo-500">
            {mode === 'login' ? '去注册' : '去登录'}
          </button>
        </p>
      </section>
    </div>
  );
}
