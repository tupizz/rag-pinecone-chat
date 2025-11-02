'use client';

import React from 'react';
import { Disclosure } from '@headlessui/react';
import { ChevronDownIcon, BookOpenIcon, FileTextIcon } from 'lucide-react';
import type { Source } from '@/types';
import { Badge } from '../catalyst/badge';
import { Text, Strong } from '../catalyst/text';

interface SourcesDisplayProps {
  sources: Source[];
}

export function SourcesDisplay({ sources }: SourcesDisplayProps) {
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 space-y-2.5 max-w-2xl">
      <div className="flex items-center gap-2">
        <BookOpenIcon className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
        <Text className="!text-xs text-zinc-600 dark:text-zinc-400">
          <Strong>{sources.length} {sources.length === 1 ? 'Source' : 'Sources'}</Strong>
        </Text>
      </div>

      <div className="space-y-2">
        {sources.map((source, idx) => (
          <Disclosure key={idx}>
            {({ open }) => (
              <div className="group border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-600 transition-all">
                <Disclosure.Button className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <FileTextIcon className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0" />

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        color={source.score >= 0.85 ? 'lime' : source.score >= 0.75 ? 'amber' : 'zinc'}
                        className="!text-xs shrink-0"
                      >
                        {Math.round(source.score * 100)}% match
                      </Badge>

                      {source.metadata?.category && (
                        <Badge color="indigo" className="!text-xs shrink-0">
                          {source.metadata.category}
                        </Badge>
                      )}

                      {source.metadata?.question && (
                        <Text className="!text-xs text-zinc-500 dark:text-zinc-400 truncate">
                          {source.metadata.question.slice(0, 50)}
                          {source.metadata.question.length > 50 ? '...' : ''}
                        </Text>
                      )}
                    </div>
                  </div>

                  <ChevronDownIcon
                    className={`w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0 transition-transform duration-200 ${
                      open ? 'transform rotate-180' : ''
                    }`}
                  />
                </Disclosure.Button>

                <Disclosure.Panel className="px-4 py-3.5 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30">
                  <div className="space-y-3.5">
                    {/* Question */}
                    {source.metadata?.question && (
                      <div>
                        <Text className="!text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                          Question
                        </Text>
                        <Text className="!text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed">
                          {source.metadata.question}
                        </Text>
                      </div>
                    )}

                    {/* Answer */}
                    {source.metadata?.answer && (
                      <div>
                        <Text className="!text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                          Answer
                        </Text>
                        <Text className="!text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          {source.metadata.answer}
                        </Text>
                      </div>
                    )}

                    {/* Full Text (if no structured Q&A) */}
                    {!source.metadata?.question && !source.metadata?.answer && source.text && (
                      <div>
                        <Text className="!text-xs font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">
                          Content
                        </Text>
                        <Text className="!text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          {source.text}
                        </Text>
                      </div>
                    )}

                    {/* Source ID */}
                    <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-700">
                      <Text className="!text-[10px] text-zinc-400 dark:text-zinc-600 font-mono">
                        {source.id}
                      </Text>
                    </div>
                  </div>
                </Disclosure.Panel>
              </div>
            )}
          </Disclosure>
        ))}
      </div>
    </div>
  );
}
