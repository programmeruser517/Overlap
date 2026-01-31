export interface SendEmailInput {
  to: string[];
  subject: string;
  body: string;
}

export interface MailPort {
  send(input: SendEmailInput): Promise<void>;
}
