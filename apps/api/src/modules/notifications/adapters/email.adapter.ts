import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailAdapter {
  private readonly logger = new Logger(EmailAdapter.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null;
  private readonly fromEmail: string;
  private readonly fromName: string;
  private readonly isMockMode: boolean;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
    this.fromEmail = this.configService.get<string>(
      'SENDGRID_FROM_EMAIL',
      'noreply@clinic.local',
    );
    this.fromName = this.configService.get<string>(
      'SENDGRID_FROM_NAME',
      'Clinic System',
    );

    if (apiKey) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(apiKey);
      this.client = sgMail;
      this.isMockMode = false;
      this.logger.log('EmailAdapter initialized with SendGrid');
    } else {
      this.isMockMode = true;
      this.logger.warn(
        'EmailAdapter running in MOCK mode — no SENDGRID_API_KEY configured',
      );
    }
  }

  async send(dto: {
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    if (this.isMockMode) {
      this.logger.log(
        `[MOCK EMAIL] To: ${dto.to} | Subject: ${dto.subject} | Body: ${dto.html.substring(0, 100)}...`,
      );
      return;
    }

    await this.client.send({
      from: { email: this.fromEmail, name: this.fromName },
      to: dto.to,
      subject: dto.subject,
      html: dto.html,
    });
  }
}
