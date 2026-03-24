import React from 'react';
import styles from './SoftShadowContainer.module.css';

export default function SoftShadowContainer({ children, className = '' }) {
  return <section className={`${styles.shell} ${className}`}>{children}</section>;
}
