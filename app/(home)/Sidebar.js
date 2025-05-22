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

export default function Sidebar({ isOpen }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', icon: faGauge, label: 'Dashboard' },
    { href: '/test', icon: faClipboardQuestion, label: 'Tests' },
    { href: '/upload-question', icon: faFilePen, label: 'Upload Questions' },
    { href: '/auth/bulk-upload', icon: faUsers, label: 'Upload Users' },
    { href: '/settings', icon: faGear, label: 'Settings' }
  ];

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}>
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => (
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
          ))}
        </ul>
      </nav>
    </aside>
  );
}