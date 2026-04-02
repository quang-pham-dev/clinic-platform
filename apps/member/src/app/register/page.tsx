'use client';

import { useAuth } from '@/features/auth/contexts/auth-context';
import {
  AlertCircle,
  Calendar,
  Lock,
  Mail,
  Phone,
  Stethoscope,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();
  const [formData, setFormData] = React.useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    dateOfBirth: '',
  });
  const [error, setError] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (isAuthenticated) router.replace('/doctors');
  }, [isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phone: formData.phone || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
      });
      router.push('/doctors');
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Registration failed. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses =
    'w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-teal-400"
          >
            <Stethoscope className="w-8 h-8" />
            <span className="text-xl font-bold">Clinic Portal</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-white">
            Create your account
          </h1>
          <p className="mt-2 text-gray-400">Start booking appointments today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm text-gray-400">Full Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="John Doe"
                className={inputClasses}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-gray-400">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className={inputClasses}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-gray-400">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={inputClasses}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-gray-400">Confirm *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className={inputClasses}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm text-gray-400">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0901234567"
                  className={inputClasses}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm text-gray-400">Date of Birth</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className={inputClasses}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-medium hover:from-teal-400 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? 'Creating Account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-teal-400 hover:text-teal-300 font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
