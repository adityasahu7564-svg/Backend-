const cron = require('node-cron');
const Capsule = require('./models/Capsule');
const User = require('./models/User');
const nodemailer = require('nodemailer');
const { decrypt } = require('./utils/crypto');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT || 587),
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

async function checkAndSend() {
  const now = new Date();
  // find capsules due in the past and not yet delivered
  const due = await Capsule.find({ deliverAt: { $lte: now }, delivered: false });
  for (const cap of due) {
    try {
      const owner = await User.findById(cap.owner);
      const message = decrypt(cap.encryptedMessage);
      // send to recipients (if none, send to owner)
      const recipients = (cap.recipients && cap.recipients.length) ? cap.recipients : [owner.email];
      for (const r of recipients) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: r,
          subject: `Your Time Capsule: ${cap.title || 'Untitled'}`,
          text: `Hello! Your time capsule titled '${cap.title || 'Untitled'}' is unlocked.\n\nMessage:\n${message}\n\nOpen link: ${process.env.BASE_URL}/open/${cap._id}`
        });
      }
      cap.delivered = true;
      await cap.save();
      console.log('Delivered capsule', cap._id);
    } catch (err) {
      console.error('Failed sending capsule', cap._id, err);
    }
  }
}

module.exports = {
  start() {
    // every minute check (for demo). In production use less frequent checks.
    cron.schedule('* * * * *', () => {
      console.log('Scheduler tick', new Date().toISOString());
      checkAndSend();
    });
  }
};