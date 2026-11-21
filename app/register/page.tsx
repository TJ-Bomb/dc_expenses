'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {Wallet} from 'lucide-react';

export default function Register(){
  const [fullName,setFull]=useState(''),[username,setUser]=useState(''),[password,setPass]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const router=useRouter();
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError('');
    try {
      const r=await fetch('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({fullName,username,password})});
      const d=await r.json();if(!r.ok){setError(d.error||'Registration failed');return}
      router.push('/');router.refresh();
    } catch {setError('Unable to register. Please try again.')} finally {setBusy(false)}
  }
  return <main className="auth-shell"><section className="auth-card">
    <div className="brand-mark"><Wallet size={27}/></div><h1>Create first account</h1>
    <p className="muted">Initial setup only. The first account becomes the administrator. After setup, ask an administrator to create additional accounts.</p>
    <form onSubmit={submit} className="stack">
      <label>Full name<input required maxLength={140} value={fullName} onChange={e=>setFull(e.target.value)}/></label>
      <label>Username<input required minLength={3} maxLength={60} pattern="[a-zA-Z0-9_.-]+" value={username} onChange={e=>setUser(e.target.value)}/></label>
      <label>Password <span className="muted small">(12+ characters)</span><input required minLength={12} maxLength={256} type="password" autoComplete="new-password" value={password} onChange={e=>setPass(e.target.value)}/></label>
      {error&&<p className="error">{error}</p>}
      <button className="primary full" disabled={busy}>{busy?'Creating…':'Create administrator account'}</button>
    </form>
    <p className="muted small">Already registered? <Link href="/login">Sign in</Link></p>
  </section></main>;
}
