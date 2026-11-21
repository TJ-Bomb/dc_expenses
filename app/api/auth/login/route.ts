import { sql } from '@/lib/db';
import { setSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const MAX_ATTEMPTS=5;

export async function POST(req:Request) {
  try {
    const b=await req.json();
    const username=String(b.username||'').trim().toLowerCase();
    const password=String(b.password||'');
    if(!username||username.length>60||!password||password.length>256)
      return Response.json({error:'Invalid username or password.'},{status:401});

    // Keep the throttle table bounded; expired keys no longer contribute to lockouts.
    await sql`DELETE FROM auth_login_attempts WHERE window_started_at < NOW()-INTERVAL '24 hours'`;

    const ip=(req.headers.get('x-real-ip')||'unknown').slice(0,100);
    const attemptKey=ip+':'+username;

    const attempts=await sql`
      INSERT INTO auth_login_attempts(attempt_key,attempts,window_started_at,blocked_until)
      VALUES(${attemptKey},1,NOW(),NULL)
      ON CONFLICT(attempt_key) DO UPDATE SET
        attempts=CASE WHEN auth_login_attempts.window_started_at<NOW()-INTERVAL '15 minutes' THEN 1 ELSE auth_login_attempts.attempts+1 END,
        window_started_at=CASE WHEN auth_login_attempts.window_started_at<NOW()-INTERVAL '15 minutes' THEN NOW() ELSE auth_login_attempts.window_started_at END,
        blocked_until=CASE
          WHEN auth_login_attempts.window_started_at<NOW()-INTERVAL '15 minutes' THEN NULL
          WHEN auth_login_attempts.attempts+1>=${MAX_ATTEMPTS} THEN NOW()+INTERVAL '15 minutes'
          ELSE auth_login_attempts.blocked_until END
      RETURNING attempts,blocked_until
    `;
    if(attempts[0]?.blocked_until&&new Date(attempts[0].blocked_until)>new Date())
      return Response.json({error:'Too many sign-in attempts. Please wait 15 minutes before trying again.'},{status:429});

    const rows=await sql`SELECT id,full_name,username,password_hash,role,is_active FROM app_users WHERE username=${username} LIMIT 1`;
    const user=rows[0];
    const valid=Boolean(user&&user.is_active&&await bcrypt.compare(password,user.password_hash));
    if(!valid) return Response.json({error:'Invalid username or password.'},{status:401});

    await sql`DELETE FROM auth_login_attempts WHERE attempt_key=${attemptKey}`;
    await setSession({id:Number(user.id),full_name:user.full_name,username:user.username,role:user.role});
    return Response.json({user:{id:user.id,full_name:user.full_name,username:user.username,role:user.role}});
  } catch {
    return Response.json({error:'Unable to sign in. Please try again later.'},{status:500});
  }
}
