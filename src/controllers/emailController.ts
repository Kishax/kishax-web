import nodemailer from 'nodemailer';
import path from 'path';
import '../config';
import { renderTemplate } from '../utils/template';
import basepath from '../utils/basepath';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  requireTLS: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const data = {
  hpurl: basepath.hpurl,
  rooturl: basepath.rooturl,
  org_logourl: process.env.ORG_LOGO_URL || '',
  org_year: process.env.ORG_YEAR || '',
  org_name: process.env.ORG_NAME || '',
};

export async function sendOneTimePass(recipient: string, pass: string): Promise<boolean> {
  data['onetime'] = pass;
  const html = await renderTemplate(path.resolve(__dirname, '../views/auth/onetime.ejs'), data);
  return await sendmail(recipient, "ワンタイムパスワード", html);
}

export async function sendVertificationEmail(recipient: string, redirectUrl: string): Promise<boolean> {
  data['email_redirect_url'] = redirectUrl;
  data['comment'] = '本人確認URLは以下の通りです。';

  const html = await renderTemplate(path.resolve(__dirname, '../views/auth/confirm.ejs'), data);
  return await sendmail(recipient, "FMCアカウントのメールアドレス認証", html);
}

export async function sendVertificationEmailForResetPassword(recipient: string, redirectUrl: string): Promise<boolean> {
  data['email_redirect_url'] = redirectUrl;
  data['comment'] = 'パスワードリセット用URLは以下の通りです。';

  const html = await renderTemplate(path.resolve(__dirname, '../views/auth/confirm.ejs'), data);
  return await sendmail(recipient, "FMCアカウントのパスワードリセット", html);
}

async function sendmail(recipient: string, subject: string, html: string): Promise<boolean> {
  try {
    const mailOptions = {
      from: `"FMC Support" <${process.env.SMTP_USER}>`,
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
