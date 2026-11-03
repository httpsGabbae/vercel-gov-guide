import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CivicMarkdown } from '../components/chat/CivicMarkdown';

const render = (content: string) =>
  renderToStaticMarkup(React.createElement(CivicMarkdown, { content }));

describe('agency procedure formatting', () => {
  it.each(['PSA', 'NBI', 'PhilHealth'])(
    'groups %s steps and their bullets in one box',
    (agency) => {
      const html = render(`**Steps for ${agency}:**

1. **1Prepare Documentary Requirements:**

- **Valid ID**
- Birth record details

1. **2Choose How to Request:**

- Online or walk-in

1. **3Pay and Receive:**

- Receive your certificate`);

      expect(html.match(/<section/g)).toHaveLength(1);
      expect(html.match(/<ol/g)).toHaveLength(1);
      expect(html.match(/<ul/g)).toHaveLength(3);
      expect(html).toContain(`Steps for ${agency}:`);
      expect(html).toContain('value="1"');
      expect(html).toContain('value="2"');
      expect(html).toContain('value="3"');
      expect(html).not.toContain('1Prepare');
      expect(html).not.toContain('2Choose');
      expect(html).toMatch(/Valid ID[\s\S]*<\/ul>[\s\S]*<\/li>[\s\S]*<li[^>]*value="2"/);
      expect(html).toContain('bg-slate-50/60');
    },
  );

  it('makes backtick URLs clickable even inside bold emphasis', () => {
    const html = render('Order at **`https://psahelpline.ph`** (**₱365.00**).');
    expect(html).toContain('href="https://psahelpline.ph"');
    expect(html).not.toContain('`');
    expect(html).toContain('₱365.00');
  });

  it('keeps separate procedures, citations, and ordinary text outside the step list', () => {
    const html = render(
      '## First procedure\n1. Prepare\n2. Submit\n\nSource: official charter\n\n## Second procedure\n1. Register\n2. Pay',
    );
    expect(html.match(/<section/g)).toHaveLength(2);
    expect(html.match(/value="1"/g)).toHaveLength(2);
    expect(html).toMatch(/<\/section><p[^>]*>Source: official charter<\/p><section/);
    expect(render('**Required documents**\n- Valid ID')).toContain(
      'aria-label="Requirements checklist"',
    );
    expect(render('**Other information**\n- Office hours')).not.toContain('<section');
  });
});
