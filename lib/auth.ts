import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { sql } from './db';
const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
const key = new TextEncoder().encode(secret);
export type SessionUser = { id:number; full_name:string; username:string; role:'admin'|'member' };
export async function setSession(user:SessionUser) {
  const token = await new SignJWT({ id:user.id, full_name:user.full_name, username:user.username, role:user.role })
    .setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('7d').sign(key);
  (await cookies()).set('dc_session', token, { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax', path:'/', maxAge:60*60*24*7 });
}
export async function getSession():Promise<SessionUser|null> {
  const token=(await cookies()).get('dc_session')?.value; if(!token) return null;
  try { const {payload}=await jwtVerify(token,key); return {id:Number(payload.id),full_name:String(payload.full_name),username:String(payload.username),role:payload.role as 'admin'|'member'}; } catch { return null; }
}
export async function requireUser() {
  const user=await getSession(); if(!user) return {user:null,response:Response.json({error:'Authentication required'},{status:401})};
  const rows=await sql`SELECT is_active FROM app_users WHERE id=${user.id} LIMIT 1`;
  if(!rows[0]?.is_active) return {user:null,response:Response.json({error:'Account disabled'},{status:403})};
  return {user,response:null};
}
export function isAdmin(role:string){return role==='admin';}
