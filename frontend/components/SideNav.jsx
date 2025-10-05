'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './SideNav.module.css';
import { 
  FiHome, 
  FiFile, 
  FiBookmark, 
  FiArchive, 
  FiClock,
  FiUser,
  FiSettings,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';

export default function SideNav() {
  const pathname = usePathname();

  const navItems = [
    { icon: <FiHome />, label: 'Dashboard', href: '/' },
    { icon: <FiFile />, label: 'My Documents', href: '/documents/my-documents' },
    { icon: <FiBookmark />, label: 'Subscribed Documents', href: '/documents/subscribed' },
    { icon: <FiFile />, label: 'All Documents', href: '/documents' },
    { icon: <FiClock />, label: 'Pending Approval', href: '/documents/pending' },
    { icon: <FiArchive />, label: 'Archived Documents', href: '/documents/archived' },
    { icon: <FiUser />, label: 'Admin', href: '/admin' },
    { icon: <FiSettings />, label: 'Settings', href: '/settings' },
  ];

  return (
    <div className={styles.sidebar}>
      {/* Logo Section (Top) */}
      <div className={styles.logoSection}>
        <div className={styles.logo}>📄</div>
        <h1 className={styles.appName}>Kodi-ing</h1>
      </div>

      {/* Navigation Sections */}
      <nav>
        {navItems.slice(0, 6).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}

        <div className={styles.divider} />

        <Link
          href="/admin"
          className={`${styles.navItem} ${pathname === '/admin' ? styles.active : ''}`}
        >
          <FiUser />
          <span>Admin</span>
        </Link>

        <div className={styles.divider} />

        <Link
          href="/settings"
          className={`${styles.navItem} ${pathname === '/settings' ? styles.active : ''}`}
        >
          <FiSettings />
          <span>Settings</span>
        </Link>
      </nav>

      {/* Account Section (Bottom) */}
      <div className={styles.accountSection}>
        <div className={styles.userIcon}>👤</div>
        <div className={styles.userInfo}>
          <p className={styles.username}>User Account</p>
          <p className={styles.userEmail}>user@example.com</p>
        </div>
      </div>
    </div>
  );
}