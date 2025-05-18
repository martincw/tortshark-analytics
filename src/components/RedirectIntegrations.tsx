import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function RedirectIntegrations() {
  const location = useLocation();
  return <Navigate to={`/data-sources${location.search}`} />;
}
