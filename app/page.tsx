import { redirect } from 'next/navigation';import { getSession } from '@/lib/auth';import Workspace from '@/components/workspace';
export default async function Home(){const user=await getSession();if(!user)redirect('/login');return <Workspace initialUser={user}/>}
