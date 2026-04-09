import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsAdapter {
  private readonly logger = new Logger(SmsAdapter.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private client: any = null;
  private readonly fromNumber: string;
  private readonly isMockMode: boolean;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>(
      'TWILIO_FROM_NUMBER',
      '+84900000000',
    );

    if (accountSid && authToken) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Twilio = require('twilio');
      this.client = new Twilio(accountSid, authToken);
      this.isMockMode = false;
      this.logger.log('SmsAdapter initialized with Twilio');
    } else {
      this.isMockMode = true;
      this.logger.warn(
        'SmsAdapter running in MOCK mode — no TWILIO_ACCOUNT_SID configured',
      );
    }
  }

  async send(dto: { to: string; body: string }): Promise<void> {
    if (!this.isValidPhoneNumber(dto.to)) {
      throw new Error(`Invalid phone number: ${dto.to}`);
    }

    if (this.isMockMode) {
      this.logger.log(
        `[MOCK SMS] To: ${dto.to} | Body: ${dto.body.substring(0, 100)}...`,
      );
      return;
    }

    await this.client.messages.create({
      from: this.fromNumber,
      to: dto.to,
      body: dto.body,
    });
  }

  private isValidPhoneNumber(phone: string): boolean {
    return /^\+\d{7,15}$/.test(phone);
  }
}
