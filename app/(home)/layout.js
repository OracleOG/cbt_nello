'use client';
import { useState, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import styles from './layout.module.css';

export default function HomeLayout({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') setDarkMode(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
      localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    }
  }, [darkMode, mounted]);

  const toggleTheme = () => setDarkMode(!darkMode);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  if (!mounted) return null;

  return (
    <div className={`${styles.container} ${sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed}`}>
      <Header 
        darkMode={darkMode} 
        toggleTheme={toggleTheme}
        toggleSidebar={toggleSidebar}
      />
      <Sidebar isOpen={sidebarOpen} />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}