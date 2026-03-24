const nodemailer = require("nodemailer");

const mailUser = process.env.EMAIL_USER || process.env.MAIL_NAME;
const mailPass = process.env.EMAIL_PASS || process.env.MAIL_PASSWORD;

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: mailUser,
    pass: mailPass,
  },
});

const sendMail = async ({
  to,
  subject,
  text = "",
  html = "",
  from = mailUser,
}) => {
  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });

  return true;
};

const sendOTP = async (recipientEmail, otp) => {
  await sendMail({
    to: recipientEmail,
    subject: "Your OTP Code",
    text: "Your OTP code is " + otp,
  });
  return true;
};

module.exports = { sendMail, sendOTP };
