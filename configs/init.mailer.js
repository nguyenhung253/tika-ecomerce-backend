const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendOTP = async (recipientEmail, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: recipientEmail,
    subject: "Your OTP Code",
    text: "Your OTP code is " + otp,
  };

  await transporter.sendMail(mailOptions);
  return true;
};

module.exports = { sendOTP };
