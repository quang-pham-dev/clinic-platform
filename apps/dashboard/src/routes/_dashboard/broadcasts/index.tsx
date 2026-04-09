import { BroadcastComposer } from '../../../features/broadcasts/components/broadcast-composer';
import { BroadcastFeed } from '../../../features/broadcasts/components/broadcast-feed';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_dashboard/broadcasts/')({
  component: BroadcastsPage,
});

function BroadcastsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          Broadcasts
        </h1>
        <p className="text-gray-400">
          Send announcements and view live broadcast history
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <BroadcastComposer />
        </div>
        <div className="lg:col-span-2">
          <BroadcastFeed />
        </div>
      </div>
    </div>
  );
}
