'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '../catalyst/dialog';
import { Field, Label, ErrorMessage, Description } from '../catalyst/fieldset';
import { Input } from '../catalyst/input';
import { Button } from '../catalyst/button';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export function RegisterModal({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) {
  const { register, anonymousMessageCount } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await register({ email, password });
      onClose();
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} size="sm">
      <DialogTitle>Create your account</DialogTitle>
      <DialogDescription>
        Join Eloquent AI to save your chat history and get unlimited messages.
      </DialogDescription>

      <DialogBody>
        {anonymousMessageCount > 0 && (
          <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg dark:bg-indigo-900/20 dark:border-indigo-800">
            <p className="font-semibold text-indigo-900 dark:text-indigo-100">Save your chat history!</p>
            <p className="text-sm text-indigo-700 mt-1 dark:text-indigo-300">
              Your {anonymousMessageCount} message{anonymousMessageCount > 1 ? 's' : ''} will be saved to your account.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} id="register-form" className="space-y-6">
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
              autoComplete="new-password"
            />
            <Description>Must be at least 8 characters long</Description>
          </Field>

          <Field>
            <Label>Confirm Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </Field>

          {error && <ErrorMessage>{error}</ErrorMessage>}
        </form>
      </DialogBody>

      <DialogActions>
        <Button plain onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" form="register-form" disabled={loading} color="indigo">
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </DialogActions>

      <div className="mt-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Sign in
        </button>
      </div>
    </Dialog>
  );
}
