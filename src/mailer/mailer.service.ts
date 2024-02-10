import { Injectable } from '@nestjs/common';
import * as nodemailer from "nodemailer"
import * as dotenv from "dotenv"
dotenv.config()

@Injectable()
export class MailerService {
    private transporter:nodemailer.Transporter
    constructor() {
        // Initialize Nodemailer transporter with SMTP settings
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
        //   port: 587,
        //   secure: false,
          auth: {
            user: process.env.AUTH_EMAIL,
            pass: process.env.AUTH_PASS,
          },
        });
    }

    async sendVerificationEmail({email, subject, html}): Promise<void> {
        // Define email content
        const mailOptions: nodemailer.SendMailOptions = {
          from: process.env.AUTH_EMAIL,
          to:email,
          subject:subject,
          html:html
        }
        // Send email
        await this.transporter.sendMail(mailOptions);
    }
}
