'use client';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMoon, faSun, faBars, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import styles from './Header.module.css';

export default function Header({ darkMode, toggleTheme, toggleSidebar }) {
  const { data: session } = useSession();

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        <button onClick={toggleSidebar} className={styles.menuButton}>
          <FontAwesomeIcon icon={faBars} />
        </button>
        <Link href="/dashboard" className={styles.logo}>
          <span>ExamPro</span>
        </Link>
      </div>

      <div className={styles.rightSection}>
        <button onClick={toggleTheme} className={styles.themeToggle}>
          <FontAwesomeIcon icon={darkMode ? faSun : faMoon} />
        </button>

        {session?.user && (
          <div className={styles.profile}>
            <span className={styles.userName}>{session.user.name}</span>
            <Link href="/api/auth/signout" className={styles.logoutButton}>
              <FontAwesomeIcon icon={faSignOutAlt} />
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}