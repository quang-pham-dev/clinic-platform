import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedNotificationTemplates1775200004000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO notification_templates (event_type, channel, subject, body) VALUES
        -- Booking confirmed
        ('booking.confirmed', 'email',
         'Your appointment is confirmed',
         'Hi {{patientName}}, your appointment with Dr. {{doctorName}} on {{date}} at {{time}} is confirmed. Please arrive 10 minutes early.'),
        ('booking.confirmed', 'in_app',
         NULL,
         'Your booking with Dr. {{doctorName}} on {{date}} at {{time}} has been confirmed.'),

        -- Booking cancelled
        ('booking.cancelled', 'email',
         'Your appointment has been cancelled',
         'Hi {{patientName}}, your appointment with Dr. {{doctorName}} on {{date}} at {{time}} has been cancelled. Reason: {{reason}}. Please rebook if needed.'),
        ('booking.cancelled', 'in_app',
         NULL,
         'Your appointment with Dr. {{doctorName}} on {{date}} has been cancelled.'),

        -- Appointment reminders
        ('appointment.reminder.24h', 'email',
         'Reminder: appointment tomorrow',
         'Hi {{patientName}}, this is a reminder that you have an appointment with Dr. {{doctorName}} tomorrow at {{time}}. Please arrive 10 minutes early.'),
        ('appointment.reminder.2h', 'sms',
         NULL,
         'Clinic reminder: appointment with Dr. {{doctorName}} in 2 hours at {{time}}.'),

        -- Shift notifications
        ('shift.assigned', 'email',
         'New shift assignment',
         'Hi {{staffName}}, you have been assigned a new shift on {{date}} ({{shiftName}}, {{startTime}} - {{endTime}}).'),
        ('shift.assigned', 'in_app',
         NULL,
         'New shift assigned: {{shiftName}} on {{date}} ({{startTime}} - {{endTime}}).'),

        -- Video session (placeholder for Sprint L)
        ('video.session.created', 'in_app',
         NULL,
         'Dr. {{doctorName}} is calling you. Click to join the video consultation.')

      ON CONFLICT (event_type, channel) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM notification_templates
      WHERE event_type IN (
        'booking.confirmed',
        'booking.cancelled',
        'appointment.reminder.24h',
        'appointment.reminder.2h',
        'shift.assigned',
        'video.session.created'
      );
    `);
  }
}
