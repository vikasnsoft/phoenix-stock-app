import { Injectable, Logger } from '@nestjs/common';
import axios, { type AxiosInstance } from 'axios';

interface SendEmailParams {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
}

interface SendAlertTriggeredEmailParams {
  readonly to: string;
  readonly alertName: string;
  readonly details: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly apiKey = process.env.SENDGRID_API_KEY;
  private readonly from = process.env.EMAIL_FROM;
  private readonly httpClient: AxiosInstance = axios.create({
    baseURL: 'https://api.sendgrid.com',
    timeout: 10000,
  });

  public async sendAlertTriggeredEmail(params: SendAlertTriggeredEmailParams): Promise<boolean> {
    const subject: string = `Alert Triggered: ${params.alertName}`;
    const html: string = `<div><h2>Alert Triggered</h2><p><strong>${params.alertName}</strong></p><pre>${JSON.stringify(params.details, null, 2)}</pre></div>`;
    return this.sendEmail({ to: params.to, subject, html });
  }

  private async sendEmail(params: SendEmailParams): Promise<boolean> {
    if (!this.apiKey || !this.from) {
      this.logger.warn('Email sending skipped: SENDGRID_API_KEY or EMAIL_FROM not configured');
      return false;
    }
    try {
      await this.httpClient.post(
        '/v3/mail/send',
        {
          personalizations: [{ to: [{ email: params.to }] }],
          from: { email: this.from },
          subject: params.subject,
          content: [{ type: 'text/html', value: params.html }],
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return true;
    } catch (err: unknown) {
      this.logger.error('Failed to send email', err);
      return false;
    }
  }
}
