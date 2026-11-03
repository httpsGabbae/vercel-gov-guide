import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { ChatLoadingAnimation } from '@/components/chat/ChatLoadingAnimation';

describe('ChatLoadingAnimation', () => {
  it('renders without crashing during working phase', () => {
    const steps = [
      { id: 'step-0', label: 'Checking document privacy', status: 'done' as const },
      { id: 'step-1', label: 'Auditing identity fields', status: 'running' as const },
      { id: 'step-2', label: 'Compiling scorecard', status: 'pending' as const },
    ];

    const html = renderToString(
      React.createElement(ChatLoadingAnimation, {
        steps,
        phase: 'working',
        fileName: 'cabatic-psa.jpg',
      })
    );

    expect(html).toContain('GovGuide AI');
    expect(html).toContain('Auditing identity fields');
  });
});
