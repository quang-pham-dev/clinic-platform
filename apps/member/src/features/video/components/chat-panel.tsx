import type { ChatMessagePayload } from '@clinic-platform/api-client/webrtc';
import { Button } from '@clinic-platform/ui';
import { format } from 'date-fns';
import { Send } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface ChatPanelProps {
  messages: ChatMessagePayload[];
  currentUserId: string;
  onSendMessage: (msg: string) => void;
}

export function ChatPanel({
  messages,
  currentUserId,
  onSendMessage,
}: ChatPanelProps) {
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800 max-w-sm w-full">
      <div className="p-4 border-b border-gray-800">
        <h2 className="font-semibold text-white">In-call Chat</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderId === currentUserId;
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm ${
                  isMe
                    ? 'bg-teal-500 text-white rounded-br-none'
                    : 'bg-gray-800 text-gray-200 rounded-bl-none'
                }`}
              >
                {msg.message}
              </div>
              <span className="text-[10px] text-gray-500 mt-1 px-1">
                {format(new Date(msg.createdAt), 'HH:mm')}
              </span>
            </div>
          );
        })}
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center text-sm text-gray-500 text-center px-4">
            No messages yet. Send a message to start chatting.
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-gray-800 bg-gray-900">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 border-none rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!text.trim()}
            className="rounded-xl h-[40px] w-[40px] shrink-0 bg-teal-500 hover:bg-teal-600 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
