import nodemailer from 'nodemailer';

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

/** Tests: keeps mails in memory. */
export class MemoryMailer implements Mailer {
  readonly sent: Mail[] = [];
  async send(mail: Mail) {
    this.sent.push(mail);
  }
}

/**
 * Development only: prints mails to the terminal. index.ts never uses it in production,
 * so verification codes and addresses do not end up in production logs.
 */
export class DevConsoleMailer implements Mailer {
  async send(mail: Mail) {
    console.log(`[dev-mail] to=${mail.to} subject="${mail.subject}"\n${mail.text}\n`);
  }
}

/**
 * Production: any SMTP provider. Pick one with EU/TR data centres and sign its data
 * processing agreement (veri işleyen sözleşmesi); list it in the privacy notice.
 *   SMTP_URL="smtps://user:pass@smtp.example.com:465"  MAIL_FROM="Aegis <no-reply@example.com>"
 */
export class SmtpMailer implements Mailer {
  private readonly transport;
  constructor(url: string, private readonly from: string) {
    this.transport = nodemailer.createTransport(url);
  }
  async send(mail: Mail) {
    await this.transport.sendMail({ from: this.from, to: mail.to, subject: mail.subject, text: mail.text });
  }
}
