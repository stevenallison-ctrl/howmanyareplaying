import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

export default function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="site-logo">
          <span className="logo-icon">🎮</span>
          <span className="logo-text">How Many Are Playing</span>
        </Link>
        <nav className="site-nav">
          <Link to="/">Leaderboard</Link>
        </nav>
      </div>
    </header>
  );
}
