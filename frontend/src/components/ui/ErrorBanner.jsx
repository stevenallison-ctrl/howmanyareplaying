import React from 'react';
import './ErrorBanner.css';

export default function ErrorBanner({ message }) {
  return (
    <div className="error-banner" role="alert">
      <strong>Error:</strong> {message}
    </div>
  );
}
