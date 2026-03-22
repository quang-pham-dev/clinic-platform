import { AppointmentStatus } from '@/common/types/appointment-status.enum';
import { JwtPayload } from '@/common/types/jwt-payload.interface';
import { Role } from '@/common/types/role.enum';
import {
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';

interface TransitionRule {
  from: AppointmentStatus;
  to: AppointmentStatus;
  allowedRoles: Role[];
  ownerOnly?: boolean;
  requireReason?: boolean;
  releaseSlot?: boolean;
}

const TRANSITION_RULES: TransitionRule[] = [
  {
    from: AppointmentStatus.PENDING,
    to: AppointmentStatus.CONFIRMED,
    allowedRoles: [Role.DOCTOR, Role.ADMIN],
    ownerOnly: true,
  },
  {
    from: AppointmentStatus.PENDING,
    to: AppointmentStatus.CANCELLED,
    allowedRoles: [Role.PATIENT, Role.ADMIN],
    ownerOnly: true,
    requireReason: true,
    releaseSlot: true,
  },
  {
    from: AppointmentStatus.CONFIRMED,
    to: AppointmentStatus.IN_PROGRESS,
    allowedRoles: [Role.DOCTOR, Role.ADMIN],
    ownerOnly: true,
  },
  {
    from: AppointmentStatus.CONFIRMED,
    to: AppointmentStatus.CANCELLED,
    allowedRoles: [Role.PATIENT, Role.ADMIN],
    ownerOnly: true,
    requireReason: true,
    releaseSlot: true,
  },
  {
    from: AppointmentStatus.CONFIRMED,
    to: AppointmentStatus.NO_SHOW,
    allowedRoles: [Role.DOCTOR, Role.ADMIN],
    ownerOnly: true,
  },
  {
    from: AppointmentStatus.IN_PROGRESS,
    to: AppointmentStatus.COMPLETED,
    allowedRoles: [Role.DOCTOR, Role.ADMIN],
    ownerOnly: true,
  },
];

@Injectable()
export class BookingStateMachine {
  /**
   * Validates a status transition and returns the rule if valid.
   * Throws INVALID_TRANSITION (422) or FORBIDDEN (403) if not.
   */
  validate(
    currentStatus: AppointmentStatus,
    targetStatus: AppointmentStatus,
    actor: JwtPayload,
    ownerIdForActor: string, // patientId or doctor.userId depending on transition
    reason?: string,
  ): TransitionRule {
    const rule = TRANSITION_RULES.find(
      (r) => r.from === currentStatus && r.to === targetStatus,
    );

    if (!rule) {
      throw new UnprocessableEntityException({
        code: 'INVALID_TRANSITION',
        message: `Cannot transition from '${currentStatus}' to '${targetStatus}'`,
      });
    }

    if (!rule.allowedRoles.includes(actor.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `Role '${actor.role}' cannot perform this transition`,
      });
    }

    if (
      rule.ownerOnly &&
      actor.role !== Role.ADMIN &&
      actor.sub !== ownerIdForActor
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to modify this appointment',
      });
    }

    if (rule.requireReason && !reason?.trim()) {
      throw new UnprocessableEntityException({
        code: 'REASON_REQUIRED',
        message: 'A reason is required for this transition',
      });
    }

    return rule;
  }

  getAvailableTransitions(
    currentStatus: AppointmentStatus,
    actorRole: Role,
  ): AppointmentStatus[] {
    return TRANSITION_RULES.filter(
      (r) => r.from === currentStatus && r.allowedRoles.includes(actorRole),
    ).map((r) => r.to);
  }
}
