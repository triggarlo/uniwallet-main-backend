const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:      { type: String, required: true, trim: true },
  category:  { type: String, default: '' },
  limit:     { type: Number, required: true, min: 1 },
  spent:     { type: Number, default: 0 },
  isOverall: { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(doc, ret) { delete ret.__v; }
  }
});

GoalSchema.virtual('percentage').get(function() {
  return this.limit > 0 ? Math.min(100, Math.round((this.spent / this.limit) * 100)) : 0;
});

GoalSchema.virtual('status').get(function() {
  const pct = this.percentage;
  if (pct >= 100) return 'exceeded';
  if (pct >= 80)  return 'warning';
  return 'ok';
});

module.exports = mongoose.model('Goal', GoalSchema);