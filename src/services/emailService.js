const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTP = async (toEmail, name, otp, type = 'verify') => {
  const isVerify = type === 'verify';
  const subject  = isVerify ? 'Verify your UniWallet account' : `${otp} is your UniWallet reset code`;
  const title    = isVerify ? 'Verify Your Email' : 'Reset Your Password';
  const message  = isVerify
    ? 'Use the code below to verify your UniWallet account.'
    : 'Use the code below to reset your UniWallet password.';

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#F2F0EA;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:40px auto;">
        <tr>
          <td style="background:#1F5C3E;border-radius:16px 16px 0 0;padding:28px 32px;text-align:center;">
            <div style="font-size:28px;font-weight:800;color:white;">UniWallet</div>
            <div style="font-size:13px;color:rgba(255,255,255,.6);margin-top:4px;">Track your naira, survive the semester</div>
          </td>
        </tr>
        <tr>
          <td style="background:#fff;padding:32px;border-radius:0 0 16px 16px;">
            <p style="font-size:16px;color:#0C0C0C;margin:0 0 8px;">Hi <strong>${name}</strong>,</p>
            <p style="font-size:14px;color:#555;margin:0 0 24px;line-height:1.6;">${message}</p>
            <div style="background:#F2F0EA;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
              <div style="letter-spacing:10px;font-size:40px;font-weight:800;color:#1F5C3E;font-family:monospace;">${otp}</div>
              <div style="font-size:12px;color:#888;margin-top:8px;">Expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes</div>
            </div>
            <p style="font-size:13px;color:#888;margin:0;line-height:1.6;">If you didn't request this, you can safely ignore this email.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      toEmail,
    subject,
    html,
    text: `Your UniWallet code is: ${otp}. Expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.`,
  });
};

const sendWelcome = async (toEmail, name) => {
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      toEmail,
    subject: `Welcome to UniWallet, ${name}!`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:40px auto;">
        <div style="background:#1F5C3E;padding:28px;border-radius:16px 16px 0 0;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:white;">UniWallet</div>
        </div>
        <div style="background:#fff;padding:32px;border-radius:0 0 16px 16px;">
          <p style="font-size:20px;font-weight:700;color:#0C0C0C;">Welcome, ${name}! 🎉</p>
          <p style="font-size:14px;color:#555;line-height:1.7;">You're all set to start managing your finances smarter.</p>
          <ul style="font-size:14px;color:#555;line-height:1.9;">
            <li>Track every naira you spend</li>
            <li>Set budget goals per category</li>
            <li>View monthly spending analytics</li>
            <li>Export your data to CSV</li>
          </ul>
          <p style="font-size:13px;color:#888;margin-top:24px;">Good luck this semester! 💪</p>
        </div>
      </div>
    `,
  });
};

module.exports = { sendOTP, sendWelcome };