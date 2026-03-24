import React from 'react';
import styles from './CurvedCard.module.css';

export default function CurvedCard({
  children,
  className = '',
  tone = 'default',
  elevated = false,
}) {
  return (
    <article className={`${styles.card} ${styles[tone] || ''} ${elevated ? styles.elevated : ''} ${className}`}>
      {children}
    </article>
  );
}
