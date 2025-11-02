'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '../catalyst/dialog';
import { Field, Label, ErrorMessage } from '../catalyst/fieldset';
import { Input } from '../catalyst/input';
import { Button } from '../catalyst/button';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export function LoginModal({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ email, password });
      onClose();
      setEmail('');
      setPassword('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="sm">
      <DialogTitle>Sign in to your account</DialogTitle>
      <DialogDescription>
        Welcome back! Please enter your credentials to continue.
      </DialogDescription>

      <DialogBody>
        <form onSubmit={handleSubmit} id="login-form" className="space-y-6">
          <Field>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
              autoComplete="email"
            />
          </Field>

          <Field>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </Field>

          {error && <ErrorMessage>{error}</ErrorMessage>}
        </form>
      </DialogBody>

      <DialogActions>
        <Button plain onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" form="login-form" disabled={loading} color="indigo">
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </DialogActions>

      <div className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Don&apos;t have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Sign up
        </button>
      </div>
    </Dialog>
  );
}
