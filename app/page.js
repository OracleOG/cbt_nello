'use client';
import { redirect } from 'next/navigation';


export default function Home() {
  redirect('/auth/login');
  
  // This code below won't execute due to the redirect
  return (
    <div className={styles.page}>
      {/* Rest of the component */}
    </div>
  );
}

