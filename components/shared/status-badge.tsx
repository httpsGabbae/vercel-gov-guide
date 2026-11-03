import React from 'react';
import { Badge } from '@/components/ui/badge';

export type ServiceStatus =
  | 'draft'
  | 'pending'
  | 'submitted'
  | 'under_review'
  | 'action_required'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'confirmed'
  | 'cancelled'
  | 'expired';

interface StatusBadgeProps {
  status: ServiceStatus | string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  switch (status) {
    case 'approved':
    case 'completed':
    case 'confirmed':
      return <Badge variant="success" className={className}>{status.toUpperCase()}</Badge>;
    case 'under_review':
    case 'pending':
    case 'submitted':
      return <Badge variant="warning" className={className}>{status.replace('_', ' ').toUpperCase()}</Badge>;
    case 'action_required':
      return <Badge variant="destructive" className={className}>ACTION REQUIRED</Badge>;
    case 'rejected':
    case 'cancelled':
    case 'expired':
      return <Badge variant="destructive" className={className}>{status.toUpperCase()}</Badge>;
    case 'draft':
    default:
      return <Badge variant="secondary" className={className}>{status.toUpperCase()}</Badge>;
  }
}
