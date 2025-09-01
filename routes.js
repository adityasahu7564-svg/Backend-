const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const Capsule = require('../models/Capsule');
const { encrypt, decrypt } = require('../utils/crypto');

const router = express.Router();

const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: 'No token' });
  const token = header.split(' ')[1];
  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = data.id;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
}

// create capsule
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { title, message, deliverAt, recipients = '[]', isPublic } = req.body;
    const recipientsParsed = JSON.parse(recipients);
    const encryptedMessage = encrypt(message || '');
    const capsule = new Capsule({
      owner: req.userId,
      recipients: recipientsParsed,
      title,
      encryptedMessage,
      filePath: req.file ? `/uploads/${req.file.filename}` : null,
      deliverAt: new Date(deliverAt),
      isPublic: isPublic === 'true'
    });
    await capsule.save();
    res.json({ capsule });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// get capsules for user
router.get('/mine', authMiddleware, async (req, res) => {
  const caps = await Capsule.find({ owner: req.userId }).sort('-createdAt');
  // do not send decrypted message
  res.json(caps);
});

// open capsule (if delivered or owner)
router.get('/open/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const cap = await Capsule.findById(id).populate('owner');
  if (!cap) return res.status(404).json({ message: 'Not found' });
  const now = new Date();
  if (!cap.delivered && String(cap.owner._id) !== req.userId) {
    return res.status(403).json({ message: 'Not yet delivered' });
  }
  const message = decrypt(cap.encryptedMessage);
  res.json({ capsule: cap, message });
});

module.exports = router;