import { ROUTES } from '../../constants';
import { useAuthStore } from '../../features/auth/store/auth.store';
import { apiHooks } from '../../lib/api';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

export const Route = createFileRoute('/_auth/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loginMutation = apiHooks.auth.useLogin({
    onSuccess: (response) => {
      setAuth(response.data.accessToken, response.data.user);
      navigate({ to: ROUTES.DASHBOARD });
    },
  });

  return (
    <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 shadow-2xl">
      <h2 className="text-xl font-semibold text-white mb-6">
        Sign in to your account
      </h2>

      {loginMutation.isError && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {(
            loginMutation.error as unknown as {
              response: { data: { message: string } };
            }
          )?.response?.data?.message ||
            'Failed to sign in. Please check your credentials.'}
        </div>
      )}

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          loginMutation.mutate({ email, password });
        }}
      >
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            disabled={loginMutation.isPending}
            placeholder="doctor@clinic.com"
            className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-300 mb-1.5"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            disabled={loginMutation.isPending}
            placeholder="••••••••"
            className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white font-medium rounded-lg transition-all duration-200 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex justify-center items-center"
        >
          {loginMutation.isPending ? (
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : null}
          {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
