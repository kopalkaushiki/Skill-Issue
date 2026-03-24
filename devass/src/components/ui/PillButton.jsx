import React from 'react';
import { Link } from 'react-router-dom';
import styles from './PillButton.module.css';

export default function PillButton({
  children,
  to,
  active = false,
  onClick,
  type = 'button',
  className = '',
}) {
  const cls = `${styles.pill} ${active ? styles.active : ''} ${className}`;

  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={cls} onClick={onClick}>
      {children}
    </button>
  );
}
