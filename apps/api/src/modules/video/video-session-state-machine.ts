import { VideoSessionStatus } from '@clinic-platform/types';
import {
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';

interface TransitionRule {
  /** Whether to record startedAt timestamp */
  recordStart?: boolean;
  /** Whether to record endedAt timestamp */
  recordEnd?: boolean;
}

type TransitionMap = Partial<
  Record<
    VideoSessionStatus,
    Partial<Record<VideoSessionStatus, TransitionRule>>
  >
>;

/**
 * Video Session State Machine
 *
 * Valid transitions (see docs/3/07-video-session-state-machine.md):
 *
 *   waiting  → active  (patient joined)
 *   waiting  → missed  (5-min BullMQ timeout job fires)
 *   waiting  → failed  (technical error)
 *   active   → ended   (either party ends normally)
 *   active   → failed  (connection error / crash)
 *
 * Terminal states: ended, missed, failed (no further transitions)
 */
@Injectable()
export class VideoSessionStateMachine {
  private readonly transitions: TransitionMap = {
    [VideoSessionStatus.WAITING]: {
      [VideoSessionStatus.ACTIVE]: { recordStart: true },
      [VideoSessionStatus.MISSED]: { recordEnd: true },
      [VideoSessionStatus.FAILED]: { recordEnd: true },
    },
    [VideoSessionStatus.ACTIVE]: {
      [VideoSessionStatus.ENDED]: { recordEnd: true },
      [VideoSessionStatus.FAILED]: { recordEnd: true },
    },
  };

  /**
   * Validate and return the transition rule for a state change.
   * Throws if the transition is not allowed.
   */
  validate(
    from: VideoSessionStatus,
    to: VideoSessionStatus,
    actorRole?: string,
  ): TransitionRule {
    const allowed = this.transitions[from];
    if (!allowed) {
      throw new ForbiddenException({
        code: 'VIDEO_SESSION_TERMINAL_STATE',
        message: `Session is in terminal state "${from}" — no further transitions allowed`,
      });
    }

    const rule = allowed[to];
    if (!rule) {
      throw new UnprocessableEntityException({
        code: 'VIDEO_SESSION_INVALID_TRANSITION',
        message: `Cannot transition video session from "${from}" to "${to}"`,
      });
    }

    // Only the doctor can end a session from ACTIVE state (or the system for FAILED)
    if (
      from === VideoSessionStatus.ACTIVE &&
      to === VideoSessionStatus.ENDED &&
      actorRole &&
      actorRole !== 'doctor' &&
      actorRole !== 'admin'
    ) {
      throw new ForbiddenException({
        code: 'VIDEO_SESSION_FORBIDDEN',
        message: 'Only the doctor or admin can end an active video session',
      });
    }

    return rule;
  }

  /** Returns true if the given status is a terminal state */
  isTerminal(status: VideoSessionStatus): boolean {
    return [
      VideoSessionStatus.ENDED,
      VideoSessionStatus.MISSED,
      VideoSessionStatus.FAILED,
    ].includes(status);
  }
}
