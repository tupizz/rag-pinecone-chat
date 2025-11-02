'use client';

import React from 'react';
import { Dialog, DialogTitle, DialogDescription, DialogBody, DialogActions } from '../catalyst/dialog';
import { Button } from '../catalyst/button';
import { Text, Strong } from '../catalyst/text';
import { AlertCircle } from 'lucide-react';

interface MessageLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: () => void;
  onLogin: () => void;
}

export function MessageLimitModal({
  isOpen,
  onClose,
  onRegister,
  onLogin,
}: MessageLimitModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} size="md">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-500" />
        </div>

        <DialogTitle>Message Limit Reached</DialogTitle>
        <DialogDescription>
          You&apos;ve used all 3 free messages. Create an account to continue chatting and save your conversation history!
        </DialogDescription>
      </div>

      <DialogBody>
        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
          <Text className="!text-sm">
            <Strong>✨ Free account benefits:</Strong>
          </Text>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
            <li className="flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">✓</span>
              Unlimited messages
            </li>
            <li className="flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">✓</span>
              Chat history saved across devices
            </li>
            <li className="flex items-center gap-2">
              <span className="text-indigo-600 dark:text-indigo-400">✓</span>
              Access to all features
            </li>
          </ul>
        </div>
      </DialogBody>

      <DialogActions>
        <Button outline onClick={onLogin} className="w-full sm:w-auto">
          Sign in
        </Button>
        <Button onClick={onRegister} color="indigo" className="w-full sm:w-auto">
          Create free account
        </Button>
      </DialogActions>
    </Dialog>
  );
}
