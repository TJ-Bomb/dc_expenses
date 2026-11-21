import { sql } from '@/lib/db';
import { setSession } from '@/lib/auth';
import { jsonError } from '@/lib/http';
import bcrypt from 'bcryptjs';

// Public registration is available only for the first administrator bootstrap.
export async function POST(req:Request) {
  try {
    const b=await req.json();
    const fullName=String(b.fullName||'').trim();
    const username=String(b.username||'').trim().toLowerCase();
    const password=String(b.password||'');
    if(fullName.length<2||fullName.length>140||username.length<3||username.length>60||
       !/^[a-z0-9_.-]+$/.test(username)||password.length<12) {
      return Response.json({error:'Enter a name, username (3–60 letters/numbers), and password (at least 12 characters).'},{status:400});
    }
    const hash=await bcrypt.hash(password,12);
    const rows=await sql\`
      WITH lock AS (SELECT pg_advisory_xact_lock(921170))
      INSERT INTO app_users(full_name,username,password_hash,role)
      SELECT \${fullName},\${username},\${hash},'admin' FROM lock
      WHERE NOT EXISTS(SELECT 1 FROM app_users)
      RETURNING id,full_name,username,role
    \`;
    if(!rows.length) return Response.json({error:'Public registration is closed. Ask an administrator to create your account.'},{status:403});
    await setSession({id:Number(rows[0].id),full_name:rows[0].full_name,username:rows[0].username,role:rows[0].role});
    return Response.json({user:rows[0]},{status:201});
  } catch(e) {
    const msg=e instanceof Error?e.message:'';
    return jsonError(msg.includes('unique')?'Username is already taken.':e,400);
  }
}
