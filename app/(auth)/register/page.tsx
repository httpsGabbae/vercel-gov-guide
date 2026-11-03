import { AuthCard } from '@/components/auth/AuthCard';

export const metadata = {
  title: 'Register · GovGuide PH',
  description: 'Create your GovGuide PH citizen account.',
};

export default function RegisterPage() {
  return <AuthCard initialMode="register" />;
}
