import React from 'react';
import BottomNav from '../ui/BottomNav';
import styles from './AppLayout.module.css';

export default function AppLayout({ title, subtitle, children, topActions }) {
  return (
    <div className={styles.canvas}>
      <div className={styles.glowOne} />
      <div className={styles.glowTwo} />
      <main className={styles.content}>
        <header className={styles.header}>
          <div>
            <h1>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
          {topActions && <div className={styles.actions}>{topActions}</div>}
        </header>
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
