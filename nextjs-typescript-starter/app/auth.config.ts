import { NextAuthConfig } from 'next-auth';

export const authConfig = {
  pages: {
    signIn: '/me',
  },
  providers: [
    // added later in auth.ts since it requires bcrypt which is only compatible with Node.js
    // while this file is also used in non-Node.js environments
  ],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      let isLoggedIn = !!auth?.user;
      let isStudyPage =
        nextUrl.pathname === '/study' || nextUrl.pathname.startsWith('/study/');

      if (!isStudyPage || isLoggedIn) return true;

      const loginUrl = new URL('/me', nextUrl);
      loginUrl.searchParams.set('auth', 'login');
      loginUrl.searchParams.set('returnTo', `${nextUrl.pathname}${nextUrl.search}`);
      return Response.redirect(loginUrl);
    },
  },
} satisfies NextAuthConfig;
