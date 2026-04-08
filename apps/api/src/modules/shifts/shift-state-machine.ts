import { JwtPayload } from '@/common/types/jwt-payload.interface';
import { AssignmentStatus, Role } from '@clinic-platform/types';
import {
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';

export interface ShiftTransitionRule {
  from: AssignmentStatus;
  to: AssignmentStatus;
  allowedRoles: Role[];
  requireReason: boolean;
  deactivateSlots: boolean;
  emitWsEvent: boolean;
}

const SHIFT_TRANSITION_RULES: ShiftTransitionRule[] = [
  {
    from: AssignmentStatus.SCHEDULED,
    to: AssignmentStatus.IN_PROGRESS,
    allowedRoles: [Role.ADMIN, Role.HEAD_NURSE, Role.DOCTOR],
    requireReason: false,
    deactivateSlots: false,
    emitWsEvent: true,
  },
  {
    from: AssignmentStatus.SCHEDULED,
    to: AssignmentStatus.CANCELLED,
    allowedRoles: [Role.ADMIN, Role.HEAD_NURSE, Role.DOCTOR],
    requireReason: true,
    deactivateSlots: true,
    emitWsEvent: true,
  },
  {
    from: AssignmentStatus.IN_PROGRESS,
    to: AssignmentStatus.COMPLETED,
    allowedRoles: [Role.ADMIN, Role.HEAD_NURSE],
    requireReason: false,
    deactivateSlots: false,
    emitWsEvent: true,
  },
  {
    from: AssignmentStatus.IN_PROGRESS,
    to: AssignmentStatus.CANCELLED,
    allowedRoles: [Role.ADMIN, Role.HEAD_NURSE],
    requireReason: true,
    deactivateSlots: false,
    emitWsEvent: true,
  },
];

@Injectable()
export class ShiftStateMachine {
  /**
   * Validates a status transition and returns the matching rule.
   * Throws if the transition is invalid or the actor lacks permission.
   */
  validate(
    currentStatus: AssignmentStatus,
    targetStatus: AssignmentStatus,
    actor: JwtPayload,
    assignment: { staffId: string; departmentId: string },
    reason?: string,
  ): ShiftTransitionRule {
    const rule = SHIFT_TRANSITION_RULES.find(
      (r) => r.from === currentStatus && r.to === targetStatus,
    );

    if (!rule) {
      throw new UnprocessableEntityException({
        code: 'INVALID_SHIFT_TRANSITION',
        message: `Cannot transition from '${currentStatus}' to '${targetStatus}'`,
      });
    }

    if (!rule.allowedRoles.includes(actor.role as Role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `Role '${actor.role}' cannot perform this transition`,
      });
    }

    // Department scope check for head_nurse
    if (
      actor.role === Role.HEAD_NURSE &&
      actor.departmentId !== assignment.departmentId
    ) {
      throw new ForbiddenException({ code: 'DEPARTMENT_SCOPE_VIOLATION' });
    }

    // Self-ownership check for doctor
    if (actor.role === Role.DOCTOR && actor.sub !== assignment.staffId) {
      throw new ForbiddenException({ code: 'FORBIDDEN' });
    }

    if (rule.requireReason && !reason?.trim()) {
      throw new UnprocessableEntityException({
        code: 'REASON_REQUIRED',
        message: 'A reason is required for this transition',
      });
    }

    return rule;
  }

  /**
   * Returns target statuses available from the current status for a given role.
   */
  getAvailableTransitions(
    currentStatus: AssignmentStatus,
    actorRole: Role,
  ): AssignmentStatus[] {
    return SHIFT_TRANSITION_RULES.filter(
      (r) => r.from === currentStatus && r.allowedRoles.includes(actorRole),
    ).map((r) => r.to);
  }
}
