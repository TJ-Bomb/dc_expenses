import { requireUser, isAdmin } from '@/lib/auth';
import { sql } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!isAdmin(user!.role)) {
    return Response.json({ error: 'Administrator access required.' }, { status: 403 });
  }

  const users = await sql`SELECT id, full_name, username, role, is_active, created_at FROM app_users ORDER BY created_at`;
  return Response.json({ users });
}

export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!isAdmin(user!.role)) {
    return Response.json({ error: 'Administrator access required.' }, { status: 403 });
  }

  const b = await req.json();
  const full = String(b.fullName || '').trim();
  const username = String(b.username || '').trim().toLowerCase();
  const password = String(b.password || '');
  const role = b.role === 'admin' ? 'admin' : 'member';

  if (full.length < 2 || full.length > 140 || username.length < 3 || username.length > 60 ||
      !/^[a-z0-9_.-]+$/.test(username) || password.length < 12 || password.length > 256) {
    return Response.json(
      { error: 'Enter a name, valid username (3–60 characters), and password (12–256 characters).' },
      { status: 400 },
    );
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await sql`
      INSERT INTO app_users(full_name, username, password_hash, role)
      VALUES(${full}, ${username}, ${hash}, ${role})
      RETURNING id, full_name, username, role, is_active
    `;
    return Response.json({ user: result[0] }, { status: 201 });
  } catch {
    return Response.json({ error: 'Username already exists.' }, { status: 409 });
  }
}

export async function PATCH(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (!isAdmin(user!.role)) {
    return Response.json({ error: 'Administrator access required.' }, { status: 403 });
  }

  const b = await req.json();
  const id = Number(b.id);
  const role = b.role === 'admin' ? 'admin' : b.role === 'member' ? 'member' : null;
  if (!Number.isSafeInteger(id) || id <= 0 || typeof b.isActive !== 'boolean' || !role) {
    return Response.json({ error: 'A valid user ID, role, and active status are required.' }, { status: 400 });
  }
  if (id === user!.id && (!b.isActive || role !== 'admin')) {
    return Response.json({ error: 'You cannot deactivate or demote your own administrator account.' }, { status: 400 });
  }

  try {
    const [, , updated] = await sql.transaction([
      sql`SELECT pg_advisory_xact_lock(921171)`,
      sql`SELECT COUNT(*) FROM app_users WHERE role = 'admin' AND is_active = TRUE`,
      sql`
        UPDATE app_users
        SET is_active = ${b.isActive}, role = ${role}, updated_at = NOW()
        WHERE id = ${id}
          AND NOT (
            role = 'admin' AND is_active = TRUE
            AND (${!b.isActive} OR ${role === 'member'})
            AND (SELECT COUNT(*) FROM app_users WHERE role = 'admin' AND is_active = TRUE) <= 1
          )
        RETURNING id, full_name, username, role, is_active
      `,
    ]);

    if (!updated.length) {
      const existing = await sql`SELECT id, role, is_active FROM app_users WHERE id = ${id} LIMIT 1`;
      if (!existing.length) return Response.json({ error: 'User not found.' }, { status: 404 });
      if (existing[0].role === 'admin' && existing[0].is_active) {
        return Response.json({ error: 'The last active administrator cannot be demoted or deactivated. Promote another active administrator first.' }, { status: 409 });
      }
      return Response.json({ error: 'Unable to update this user.' }, { status: 409 });
    }

    return Response.json({ user: updated[0] });
  } catch {
    return Response.json({ error: 'Unable to update user. Please try again.' }, { status: 500 });
  }
}
