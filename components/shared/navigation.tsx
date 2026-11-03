import React from 'react';
import Link from 'next/link';

interface NavItem {
  label: string;
  href: string;
}

const navItems: NavItem[] = [
  { label: 'Citizen Portal', href: '/chat' },
  { label: 'Services', href: '/services' },
  { label: 'Appointments', href: '/appointments' },
];

export function Navigation() {
  return (
    <nav className="flex items-center gap-6 text-sm font-medium">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
