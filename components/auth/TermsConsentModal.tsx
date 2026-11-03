'use client';

import React, { useState, useEffect } from 'react';
import { TermsModal } from './TermsModal';
import { ConsentModal } from './ConsentModal';

export { TermsModal } from './TermsModal';
export { ConsentModal } from './ConsentModal';

export function TermsConsentModal() {
  const [showTerms, setShowTerms] = useState(false);
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    const handleOpenTerms = () => setShowTerms(true);
    const handleOpenConsent = () => setShowConsent(true);

    window.addEventListener('govguide:open-terms', handleOpenTerms);
    window.addEventListener('govguide:open-consent', handleOpenConsent);

    return () => {
      window.removeEventListener('govguide:open-terms', handleOpenTerms);
      window.removeEventListener('govguide:open-consent', handleOpenConsent);
    };
  }, []);

  return (
    <>
      <TermsModal open={showTerms} onClose={() => setShowTerms(false)} />
      <ConsentModal open={showConsent} onClose={() => setShowConsent(false)} />
    </>
  );
}
