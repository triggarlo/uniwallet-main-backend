const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:      { type: String, required: true, minlength: 6, select: false },
  university:    { type: String, default: '' },
  level:         { type: String, default: '' },
  bio:           { type: String, default: '' },
  monthlyBudget: { type: Number, default: 50000 },
  isVerified:    { type: Boolean, default: false },
  isActive:      { type: Boolean, default: true },
  // OTP fields
  otp:           { type: String, select: false },
  otpExpires:    { type: Date, select: false },
  otpType:       { type: String, select: false }, // 'verify' or 'reset'
  // Tokens
  refreshToken:  { type: String, select: false },
  // Preferences
  prefs: {
    darkMode:     { type: Boolean, default: false },
    survivalMode: { type: Boolean, default: true },
    goalAlerts:   { type: Boolean, default: true },
  },
}, { timestamps: true });

// Hash password before save
UserSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare passwords
UserSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Generate OTP
UserSchema.methods.generateOTP = function(type = 'verify') {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const mins = parseInt(process.env.OTP_EXPIRES_MINUTES || '10');
  this.otp = otp;
  this.otpExpires = new Date(Date.now() + mins * 60 * 1000);
  this.otpType = type;
  return otp;
};

// Get initials
UserSchema.virtual('initials').get(function() {
  return this.name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
});

UserSchema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    delete ret.password;
    delete ret.otp;
    delete ret.otpExpires;
    delete ret.otpType;
    delete ret.refreshToken;
    delete ret.__v;
  }
});

module.exports = mongoose.model('User', UserSchema);