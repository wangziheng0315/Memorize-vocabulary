'use server';

import { createUser, getUser } from 'app/db';
import { signIn, signOut } from 'app/auth';

export type AuthFormState = { error?: string };

function safeReturnTo(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !value.startsWith('/study/')) return '/';
  return value;
}

function credentials(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  return { email, password, returnTo: safeReturnTo(formData.get('returnTo')) };
}

function isCredentialsError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'CredentialsSignin'
  );
}

function isRedirect(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof error.digest === 'string' &&
    error.digest.startsWith('NEXT_REDIRECT')
  );
}

export async function loginAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password, returnTo } = credentials(formData);
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6) {
    return { error: '请输入有效的邮箱和密码。' };
  }

  try {
    await signIn('credentials', { email, password, redirectTo: returnTo });
  } catch (error) {
    if (isCredentialsError(error)) return { error: '邮箱或密码不正确。' };
    if (isRedirect(error)) throw error;
    return { error: '登录失败，请检查网络后重试。' };
  }

  return {};
}

export async function registerAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const { email, password, returnTo } = credentials(formData);
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: '请输入有效的邮箱地址。' };
  if (password.length < 6) return { error: '密码至少需要 6 位。' };

  const existingUsers = await getUser(email);
  if (existingUsers.length > 0) return { error: '该邮箱已注册，请直接登录。' };

  try {
    await createUser(email, password);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    ) {
      return { error: '该邮箱已注册，请直接登录。' };
    }
    return { error: '注册失败，请稍后重试。' };
  }

  try {
    await signIn('credentials', { email, password, redirectTo: returnTo });
  } catch (error) {
    if (isCredentialsError(error)) return { error: '注册成功，请使用新密码登录。' };
    if (isRedirect(error)) throw error;
    return { error: '注册成功，请返回登录。' };
  }

  return {};
}

export async function signOutAction() {
  await signOut({ redirectTo: '/' });
}
