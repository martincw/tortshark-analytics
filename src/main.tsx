
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { toast } from 'sonner'

// Try to get Google Client ID from environment
// If not available, the app will still load but Google OAuth features won't work
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Create a wrapper to safely initialize Google OAuth
const GoogleAuthWrapper = ({ children }: { children: React.ReactNode }) => {
  // If no Google Client ID is available, render children directly without GoogleOAuthProvider
  if (!GOOGLE_CLIENT_ID) {
    console.warn('No Google Client ID found. Google authentication features will be disabled.');
    return <>{children}</>;
  }

  // If Google Client ID exists, wrap with GoogleOAuthProvider
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {children}
    </GoogleOAuthProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleAuthWrapper>
      <App />
    </GoogleAuthWrapper>
  </React.StrictMode>,
)
