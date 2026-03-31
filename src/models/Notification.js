const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:  { type: String, enum: ['info', 'warn', 'danger', 'success'], default: 'info' },
  title: { type: String, required: true },
  body:  { type: String, required: true },
  read:  { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(doc, ret) { delete ret.__v; }
  }
});

NotificationSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);