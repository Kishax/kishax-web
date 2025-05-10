import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import path from 'path';
import config from '../config';
import { renderTemplate } from '../utils/template';

const transporter: Transporter = nodemailer.createTransport({
  host: config.server.modules.nodemailer.host,
  port: config.server.modules.nodemailer.port,
  secure: config.server.modules.nodemailer.port === 465,
  requireTLS: true,
  auth: {
    user: config.server.modules.nodemailer.user,
    pass: config.server.modules.nodemailer.password,
  },
} as SMTPTransport.Options);

export async function sendOneTimePass(recipient: string, pass: string): Promise<boolean> {
  config['onetime'] = pass;
  const html = await renderTemplate(path.resolve(__dirname, '../views/auth/onetime.ejs'), { config: config });
  return await sendmail(recipient, "ワンタイムパスワード", html);
}

export async function sendVertificationEmail(recipient: string, redirectUrl: string): Promise<boolean> {
  config['email_redirect_url'] = redirectUrl;
  config['comment'] = '本人確認URLは以下の通りです。';

  const html = await renderTemplate(path.resolve(__dirname, '../views/auth/confirm.ejs'), { config: config });
  return await sendmail(recipient, "Kishaxアカウントのメールアドレス認証", html);
}

export async function sendVertificationEmailForResetPassword(recipient: string, redirectUrl: string): Promise<boolean> {
  config['email_redirect_url'] = redirectUrl;
  config['comment'] = 'パスワードリセット用URLは以下の通りです。';

  const html = await renderTemplate(path.resolve(__dirname, '../views/auth/confirm.ejs'), { config: config });
  return await sendmail(recipient, "Kishaxアカウントのパスワードリセット", html);
}

async function sendmail(recipient: string, subject: string, html: string): Promise<boolean> {
  try {
    const mailOptions = {
      from: `"Kishax Support" <${config.server.modules.nodemailer.user}>`,
      to: recipient,
      subject: subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('sent mail successfully: %s', info.messageId)

    return true;
  } catch (error) {
    console.error('error occurred while sending mail: ', error);
    return false;
  }
}
