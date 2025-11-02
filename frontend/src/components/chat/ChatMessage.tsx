/* eslint-disable @next/next/no-img-element */
"use client";

import type { Message, Source } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { BrainIcon, UserRound } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Text } from "../catalyst/text";
import { SourcesDisplay } from "./SourcesDisplay";

type MarkdownCodeProps = HTMLAttributes<HTMLElement> & {
  inline?: boolean;
  className?: string;
  children: ReactNode[];
};

const CodeBlock = ({
  inline = false,
  className,
  children,
  ...props
}: MarkdownCodeProps) => {
  const content = String(children).replace(/\n$/, "");

  if (inline) {
    return (
      <code
        className="rounded bg-zinc-200 px-1 py-0.5 text-[13px] text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
        {...props}
      >
        {content}
      </code>
    );
  }

  return (
    <pre className="mt-3 overflow-x-auto rounded-md bg-zinc-900/90 px-3 py-2 text-sm text-zinc-100">
      <code className={className} {...props}>
        {content}
      </code>
    </pre>
  );
};

const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="whitespace-pre-wrap wrap-break-word leading-normal text-sm text-zinc-700 dark:text-zinc-200">
      {children}
    </p>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="font-medium text-indigo-500 underline-offset-4 hover:text-indigo-400 hover:underline"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  code: CodeBlock as Components["code"],
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-indigo-200 bg-indigo-50/60 px-4 py-2 text-sm text-zinc-600 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-zinc-300">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-200">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="marker:text-indigo-300 dark:marker:text-indigo-400">
      {children}
    </li>
  ),
  hr: () => (
    <hr className="my-4 border-t border-zinc-200 dark:border-zinc-800" />
  ),
  h1: ({ children }) => (
    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mt-1">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mt-1">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mt-1">
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mt-1">
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mt-1">
      {children}
    </h6>
  ),
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className="my-3 w-full max-w-md rounded-lg border border-zinc-200 shadow-sm dark:border-zinc-800"
    />
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full border-collapse text-sm text-zinc-700 dark:text-zinc-200">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
      {children}
    </tbody>
  ),
  tr: ({ children }) => (
    <tr className="even:bg-zinc-50 dark:even:bg-zinc-900/40">{children}</tr>
  ),
  th: ({ children }) => <th className="px-4 py-2 font-semibold">{children}</th>,
  td: ({ children }) => <td className="px-4 py-2 align-top">{children}</td>,
};

interface ChatMessageProps {
  message: Message;
  sources?: Source[];
  isStreaming?: boolean;
}

export function ChatMessage({
  message,
  sources,
  isStreaming = false,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`
        flex gap-3 px-4 py-3 animate-slide-in
        ${isUser ? "flex-row-reverse" : "flex-row"}
      `}
    >
      {/* Avatar */}
      <div
        className={`
          w-8 h-8 shrink-0 rounded-full flex items-center justify-center
          ${
            isUser
              ? "bg-indigo-500 text-white"
              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }
        `}
      >
        {isUser ? (
          <UserRound className="w-4 h-4" aria-hidden />
        ) : (
          <BrainIcon className="w-4 h-4" aria-hidden />
        )}
      </div>

      {/* Message Content */}
      <div
        className={`flex-1 ${
          isUser ? "items-end" : "items-start"
        } flex flex-col max-w-[85%]`}
      >
        {/* Message Bubble */}
        <div
          className={`
            rounded-lg px-4 py-2
            ${
              isUser
                ? "bg-indigo-500 text-white"
                : "bg-zinc-100 border border-zinc-200 text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-50"
            }
            ${isStreaming ? "animate-pulse" : ""}
            transition-all
          `}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap wrap-break-word leading-normal text-sm px-1 py-1">
              {message.content}
            </p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none px-2 py-2">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Metadata */}
        <div
          className={`flex items-center gap-1.5 ${
            isUser ? "flex-row-reverse" : ""
          }`}
        >
          <Text className="text-[11px]! text-zinc-500 dark:text-zinc-400">
            {formatDistanceToNow(new Date(message.timestamp), {
              addSuffix: true,
            })}
          </Text>
        </div>

        {/* Sources */}
        {!isUser && <SourcesDisplay sources={sources || []} />}
      </div>
    </div>
  );
}
