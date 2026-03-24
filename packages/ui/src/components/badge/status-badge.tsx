import { Badge } from './badge';
import { AppointmentStatus } from '@clinic-platform/types';

const statusConfig: Record<
  AppointmentStatus,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'success' | 'warning';
  }
> = {
  [AppointmentStatus.PENDING]: { label: 'Pending', variant: 'warning' },
  [AppointmentStatus.CONFIRMED]: { label: 'Confirmed', variant: 'success' },
  [AppointmentStatus.CHECKED_IN]: { label: 'Checked In', variant: 'secondary' },
  [AppointmentStatus.IN_PROGRESS]: { label: 'In Progress', variant: 'default' },
  [AppointmentStatus.COMPLETED]: { label: 'Completed', variant: 'success' },
  [AppointmentStatus.CANCELLED]: { label: 'Cancelled', variant: 'destructive' },
  [AppointmentStatus.NO_SHOW]: { label: 'No Show', variant: 'destructive' },
};

interface StatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    variant: 'secondary',
  };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
