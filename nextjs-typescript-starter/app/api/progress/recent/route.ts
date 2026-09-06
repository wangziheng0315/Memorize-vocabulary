import { NextResponse } from 'next/server';
import { auth } from 'app/auth';
import { getProgressSummaries, getUserId } from 'app/db';

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: '请先登录。' }, { status: 401 });

  const userId = await getUserId(email);
  if (!userId) return NextResponse.json({ error: '请先登录。' }, { status: 401 });

  const progress = await getProgressSummaries(userId);
  return NextResponse.json(progress.slice(0, 3));
}
