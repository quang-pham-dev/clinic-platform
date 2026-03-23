import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { BookingCreatedEvent } from '../events/booking-created.event';

@Injectable()
export class BookingsListener {
  private readonly logger = new Logger(BookingsListener.name);

  // In a real application, you would inject an EmailService or NotificationService
  // @TODO: Implement email service
  // constructor(private readonly emailService: EmailService) {}

  @OnEvent('booking.created', { async: true })
  handleBookingCreatedEvent(payload: BookingCreatedEvent) {
    this.logger.log(
      `Handling booking.created event: Sending confirmation email for appointment ${payload.appointmentId}`,
    );
    // Simulate async email sending
    setTimeout(() => {
      this.logger.debug(
        `Email confirmation sent successfully for appointment ${payload.appointmentId}`,
      );
    }, 1000);
  }
}
