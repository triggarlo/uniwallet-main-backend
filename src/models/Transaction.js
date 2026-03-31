const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:      { type: String, required: true, trim: true },
  amount:    { type: Number, required: true, min: 0 },
  type:      { type: String, enum: ['expense', 'income'], required: true },
  category:  { type: String, default: 'Other' },
  emoji:     { type: String, default: '📌' },
  note:      { type: String, default: '' },
  date:      { type: String, required: true },
  time:      { type: String, default: '' },
  recurring: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(doc, ret) { delete ret.__v; }
  }
});

TransactionSchema.index({ user: 1, date: -1 });
TransactionSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('Transaction', TransactionSchema);