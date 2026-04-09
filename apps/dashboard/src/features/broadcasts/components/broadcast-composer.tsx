import { useAuthStore } from '../../auth/store/auth.store';
import { apiHooks } from '@/lib/api';
import { Role } from '@clinic-platform/types';
import { Button } from '@clinic-platform/ui';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@clinic-platform/ui';
import { Label } from '@clinic-platform/ui';
import { Megaphone, Send } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

export function BroadcastComposer() {
  const user = useAuthStore((s) => s.user);
  const [targetRoom, setTargetRoom] = useState<string>('');
  const [message, setMessage] = useState('');

  const { mutate: sendBroadcast, isPending } =
    apiHooks.broadcasts.useSendBroadcast();

  // If head nurse, they can only broadcast to 'all' or their own department.
  // We'll give admin all options. For demo, we just populate a few defaults.
  const roomOptions = [
    { value: 'room:all', label: 'All Staff' },
    { value: 'room:nurses', label: 'All Nurses' },
    { value: 'room:doctors', label: 'All Doctors' },
    { value: 'room:receptionists', label: 'All Receptionists' },
  ];

  // Add department option if head nurse
  if (
    user?.role === Role.HEAD_NURSE &&
    (user as { departmentId?: string }).departmentId
  ) {
    roomOptions.push({
      value: `room:dept:${(user as { departmentId?: string }).departmentId}`,
      label: 'My Department',
    });
  }

  // Filter options based on role
  const allowedOptions =
    user?.role === Role.ADMIN
      ? roomOptions
      : roomOptions.filter(
          (opt) =>
            opt.value === 'room:all' ||
            ((user as { departmentId?: string })?.departmentId &&
              opt.value ===
                `room:dept:${(user as { departmentId?: string }).departmentId}`),
        );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRoom || !message.trim()) return;

    sendBroadcast(
      { targetRoom, message },
      {
        onSuccess: () => {
          toast.success('Broadcast sent successfully');
          setMessage('');
        },
        onError: (err: unknown) => {
          toast.error(
            (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message || 'Failed to send broadcast',
          );
        },
      },
    );
  };

  if (user?.role !== Role.ADMIN && user?.role !== Role.HEAD_NURSE) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          You do not have permission to send broadcasts.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-gray-800 bg-gray-900/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-teal-400" />
          Send Announcement
        </CardTitle>
        <CardDescription>
          Broadcast real-time messages to clinic staff
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <select
              value={targetRoom}
              onChange={(e) => setTargetRoom(e.target.value)}
              className="w-full flex h-10 items-center justify-between rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-white"
            >
              <option value="" disabled hidden>
                Select who should receive this message
              </option>
              {allowedOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Message content</Label>
            <textarea
              placeholder="e.g., Emergency drill in 30 minutes at Station 3..."
              className="flex w-full rounded-md border border-gray-800 bg-gray-950 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none h-32 text-white"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
            />
            <div className="text-right text-xs text-gray-500">
              {message.length} / 2000
            </div>
          </div>

          <Button
            type="submit"
            disabled={!targetRoom || !message.trim() || isPending}
            className="w-full bg-teal-600 hover:bg-teal-500 text-white"
          >
            {isPending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Broadcast Message
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
