import { AuthCard } from '@/components/auth/AuthCard';

export const metadata = {
  title: 'Sign In · GovGuide PH',
  description: 'Sign in to your GovGuide PH citizen or agency account.',
};

export default function LoginPage() {
  return <AuthCard initialMode="login" />;
}
