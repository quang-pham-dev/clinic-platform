/**
 * P2: Shift management domain events.
 *
 * These events are emitted after transaction commit in the ShiftsService.
 * P3+ listeners (notifications, broadcasts) can react to them without
 * modifying this module.
 *
 * @see docs/00-event-driven-architecture.md for naming conventions
 */

export class ShiftAssignedEvent {
  constructor(
    public readonly assignmentId: string,
    public readonly staffId: string,
    public readonly departmentId: string,
    public readonly shiftDate: string,
    public readonly templateId: string,
    public readonly createdBy: string,
  ) {}
}

export class ShiftStatusChangedEvent {
  constructor(
    public readonly assignmentId: string,
    public readonly staffId: string,
    public readonly departmentId: string,
    public readonly fromStatus: string | null,
    public readonly toStatus: string,
    public readonly actorId: string,
    public readonly actorRole: string,
    public readonly reason?: string,
  ) {}
}

export class ShiftCancelledEvent {
  constructor(
    public readonly assignmentId: string,
    public readonly staffId: string,
    public readonly departmentId: string,
    public readonly shiftDate: string,
    public readonly cancelledBy: string,
    public readonly reason: string,
  ) {}
}
