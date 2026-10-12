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
 * Development only: prints mails to the terminal. index.ts refuses to start in production
 * with this mailer, so verification codes and addresses never end up in production logs.
 * Production: implement Mailer with your provider's SMTP/API (EU region, signed DPA).
 */
export class DevConsoleMailer implements Mailer {
  async send(mail: Mail) {
    console.log(`[dev-mail] to=${mail.to} subject="${mail.subject}"\n${mail.text}\n`);
  }
}
