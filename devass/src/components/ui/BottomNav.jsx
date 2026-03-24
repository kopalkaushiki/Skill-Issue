import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from './BottomNav.module.css';

const items = [
  { to: '/dashboard', label: 'Home', icon: '⌂' },
  { to: '/projects/project-001', label: 'Projects', icon: '◉' },
  { to: '/profile', label: 'Account', icon: '◌' },
];

export default function BottomNav() {
  return (
    <nav className={styles.bottomNav}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
        >
          <span aria-hidden>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
      <button className={styles.plusButton} type="button" aria-label="Create collaboration post">
        +
      </button>
    </nav>
  );
}
