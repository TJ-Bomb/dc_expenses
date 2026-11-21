import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { sql } from './db';

const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
const key = new TextEncoder().encode(secret);
const SESSION_COOKIE = 'dc_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type SessionUser = { id:number; full_name:string; username:string; role:'admin'|'member' };

export async function setSession(user:SessionUser) {
  const token = await new SignJWT({ id:user.id, full_name:user.full_name, username:user.username, role:user.role })
    .setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`).sign(key);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'strict',
    path:'/', maxAge:SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSession() {
  (await cookies()).set(SESSION_COOKIE, '', {
    httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'strict',
    path:'/', maxAge:0,
  });
}

export async function getSession():Promise<SessionUser|null> {
  const token=(await cookies()).get(SESSION_COOKIE)?.value;
  if(!token) return null;
  try {
    const {payload}=await jwtVerify(token,key);
    const id=Number(payload.id);
    const role=payload.role;
    if(!Number.isSafeInteger(id)||id<=0||(role!=='admin'&&role!=='member')) return null;
    return {id,full_name:String(payload.full_name??''),username:String(payload.username??''),role};
  } catch { return null; }
}

export async function requireUser() {
  const session=await getSession();
  if(!session) return {user:null,response:Response.json({error:'Authentication required'},{status:401})};
  const rows=await sql`SELECT id,full_name,username,role,is_active FROM app_users WHERE id=${session.id} LIMIT 1`;
  const account=rows[0];
  if(!account?.is_active) return {user:null,response:Response.json({error:'Account disabled'},{status:403})};
  const user:SessionUser={id:Number(account.id),full_name:account.full_name,username:account.username,role:account.role};
  return {user,response:null};
}
export function isAdmin(role:string){return role==='admin';}
