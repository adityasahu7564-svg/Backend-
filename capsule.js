const mongoose = require('mongoose');

const capsuleSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  recipients: [String],
  title: String,
  encryptedMessage: String,
  filePath: String,
  deliverAt: Date,
  delivered: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Capsule', capsuleSchema);