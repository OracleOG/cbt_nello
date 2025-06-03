'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faGauge, 
  faFilePen, 
  faUsers, 
  faGear,
  faClipboardQuestion
} from '@fortawesome/free-solid-svg-icons';
import styles from './Sidebar.module.css';
import { useSession } from 'next-auth/react';

export default function Sidebar({ isOpen }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const navItems = [
    { href: '/dashboard', icon: faGauge, label: 'Dashboard' },
    { href: '/test', icon: faClipboardQuestion, label: 'Tests' },
    { href: '/upload-question', icon: faFilePen, label: 'Upload Questions' },
    { href: '/auth/bulk-upload', icon: faUsers, label: 'Upload Users' }
  ];

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => {
            // hide upload-question and upload-users for students
            if (session?.user?.role !== 'admin' && 
              (item.label === 'Upload Questions' || item.label === 'Upload Users')) {
              return null;
            }
            return(
            <li key={item.href}>
              <Link 
                href={item.href} 
                className={`${styles.navLink} ${
                  pathname.startsWith(item.href) ? styles.active : ''
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className={styles.navIcon} />
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            </li>
          )})}
        </ul>
      </nav>
    </aside>
  );
}