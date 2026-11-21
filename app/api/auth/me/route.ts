import { requireUser } from '@/lib/auth';
export async function GET() {
  const { user, response } = await requireUser();
  if (response) return Response.json({ user: null });
  return Response.json({ user });
}
