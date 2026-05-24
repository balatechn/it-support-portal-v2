import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const from = process.env.SMTP_FROM || 'IT Support <noreply@company.com>';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

class EmailService {
  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!process.env.SMTP_USER) { logger.warn('Email not configured, skipping send'); return; }
    try {
      await transporter.sendMail({ from, to, subject, html });
    } catch (err) {
      logger.error('Email send error:', err);
    }
  }

  async sendPasswordReset(to: string, name: string, token: string): Promise<void> {
    const link = `${frontendUrl}/reset-password?token=${token}`;
    await this.send(to, 'IT Support - Password Reset Request', `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563eb">IT Support Portal</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Click the button below to proceed:</p>
        <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">Reset Password</a>
        <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        <p style="color:#888;font-size:12px">IT Support Team</p>
      </div>
    `);
  }

  async sendTicketCreated(to: string, ticketId: string, title: string): Promise<void> {
    const link = `${frontendUrl}/tickets/${ticketId}`;
    await this.send(to, `IT Support - Ticket ${ticketId} Created`, `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563eb">Ticket Created Successfully</h2>
        <p>Your support ticket has been created:</p>
        <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0">
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <p><strong>Issue:</strong> ${title}</p>
        </div>
        <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">View Ticket</a>
        <p style="color:#888;font-size:12px">IT Support Team</p>
      </div>
    `);
  }

  async sendTicketAssigned(to: string, name: string, ticketId: string, title: string): Promise<void> {
    const link = `${frontendUrl}/engineer/tickets/${ticketId}`;
    await this.send(to, `IT Support - Ticket ${ticketId} Assigned to You`, `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563eb">New Ticket Assigned</h2>
        <p>Hi ${name},</p>
        <p>A new ticket has been assigned to you:</p>
        <div style="background:#f3f4f6;padding:16px;border-radius:8px;margin:16px 0">
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <p><strong>Issue:</strong> ${title}</p>
        </div>
        <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">View & Respond</a>
      </div>
    `);
  }

  async sendTicketResolved(to: string, ticketId: string, title: string): Promise<void> {
    await this.send(to, `IT Support - Ticket ${ticketId} Resolved`, `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#16a34a">Ticket Resolved</h2>
        <p>Your IT support ticket has been resolved:</p>
        <div style="background:#f0fdf4;padding:16px;border-radius:8px;margin:16px 0">
          <p><strong>Ticket ID:</strong> ${ticketId}</p>
          <p><strong>Issue:</strong> ${title}</p>
        </div>
        <p>If your issue persists, you can reopen the ticket from the portal.</p>
      </div>
    `);
  }
}

export const emailService = new EmailService();
