const router  = require('express').Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const { sendOTP, sendWelcome } = require('../services/emailService');
const { signAccessToken, signRefreshToken, protect } = require('../middleware/auth');

/* ─── REGISTER ─── */
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, monthlyBudget, university } = req.body;
    if (!name)                    return res.status(422).json({ success: false, message: 'Name is required.' });
    if (!email?.includes('@'))    return res.status(422).json({ success: false, message: 'Valid email required.' });
    if (!password || password.length < 6) return res.status(422).json({ success: false, message: 'Password must be at least 6 characters.' });

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ success: false, message: 'Email already registered.' });

    const user = new User({ name, email, password, monthlyBudget: monthlyBudget || 50000, university: university || '' });
    const otp  = user.generateOTP('verify');
    await user.save();

    // Send verification OTP
    try {
      await sendOTP(email, name.split(' ')[0], otp, 'verify');
    } catch (emailErr) {
      console.error('Email error:', emailErr.message);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Verification OTP for ${email}: ${otp}`);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Account created! Please check your email for a verification code.',
      email,
      requiresVerification: true,
    });
  } catch (err) { next(err); }
});

/* ─── VERIFY EMAIL OTP ─── */
router.post('/verify-email', async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(422).json({ success: false, message: 'Email and OTP required.' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+otp +otpExpires +otpType +refreshToken');
    if (!user) return res.status(400).json({ success: false, message: 'User not found.' });

    if (!user.otp || user.otp !== otp) return res.status(400).json({ success: false, message: 'Incorrect code.' });
    if (new Date() > user.otpExpires)  return res.status(400).json({ success: false, message: 'Code has expired. Please request a new one.' });
    if (user.otpType !== 'verify')     return res.status(400).json({ success: false, message: 'Invalid code type.' });

    user.isVerified  = true;
    user.otp         = undefined;
    user.otpExpires  = undefined;
    user.otpType     = undefined;
    const accessToken  = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    user.refreshToken  = refreshToken;
    await user.save();

    // Send welcome email
    sendWelcome(email, user.name.split(' ')[0]).catch(() => {});

    res.json({ success: true, message: 'Email verified! Welcome to UniWallet.', accessToken, refreshToken, user });
  } catch (err) { next(err); }
});

/* ─── RESEND VERIFICATION OTP ─── */
router.post('/resend-verification', async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select('+otp +otpExpires +otpType');
    if (!user) return res.status(400).json({ success: false, message: 'User not found.' });
    if (user.isVerified) return res.status(400).json({ success: false, message: 'Email already verified.' });

    const otp = user.generateOTP('verify');
    await user.save();

    try {
      await sendOTP(email, user.name.split(' ')[0], otp, 'verify');
    } catch {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Resent OTP for ${email}: ${otp}`);
      }
    }

    res.json({ success: true, message: 'New verification code sent.' });
  } catch (err) { next(err); }
});

/* ─── LOGIN ─── */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(422).json({ success: false, message: 'Email and password required.' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +refreshToken');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Incorrect email or password.' });
    }

    if (!user.isVerified) {
      // Resend verification OTP
      const otp = user.generateOTP('verify');
      await user.save();
      try {
        await sendOTP(email, user.name.split(' ')[0], otp, 'verify');
      } catch {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEV] Verification OTP for ${email}: ${otp}`);
        }
      }
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first. A new code has been sent.',
        requiresVerification: true,
        email,
      });
    }

    const accessToken  = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    user.refreshToken  = refreshToken;
    user.lastLoginAt   = new Date();
    await user.save();

    res.json({ success: true, accessToken, refreshToken, user });
  } catch (err) { next(err); }
});

/* ─── FORGOT PASSWORD ─── */
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(422).json({ success: false, message: 'Email required.' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+otp +otpExpires +otpType');
    if (!user) return res.json({ success: true, message: 'If that email exists, a code has been sent.' });

    const otp = user.generateOTP('reset');
    await user.save();

    try {
      await sendOTP(email, user.name.split(' ')[0], otp, 'reset');
    } catch (emailErr) {
      console.error('Email error:', emailErr.message);
      if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV] Reset OTP for ${email}: ${otp}`);
      }
    }

    res.json({ success: true, message: 'If that email exists, a code has been sent.' });
  } catch (err) { next(err); }
});

/* ─── VERIFY RESET OTP ─── */
router.post('/verify-otp', async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(422).json({ success: false, message: 'Email and OTP required.' });

    const user = await User.findOne({ email: email.toLowerCase() }).select('+otp +otpExpires +otpType');
    if (!user) return res.status(400).json({ success: false, message: 'Invalid request.' });

    if (!user.otp || user.otp !== otp) return res.status(400).json({ success: false, message: 'Incorrect code.' });
    if (new Date() > user.otpExpires)  return res.status(400).json({ success: false, message: 'Code expired. Request a new one.' });
    if (user.otpType !== 'reset')      return res.status(400).json({ success: false, message: 'Invalid code type.' });

    const resetToken = jwt.sign(
      { id: user._id, purpose: 'reset' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    res.json({ success: true, message: 'Code verified.', resetToken });
  } catch (err) { next(err); }
});

/* ─── RESET PASSWORD ─── */
router.post('/reset-password', async (req, res, next) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) return res.status(422).json({ success: false, message: 'Reset token and new password required.' });
    if (newPassword.length < 6) return res.status(422).json({ success: false, message: 'Password must be at least 6 characters.' });

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ success: false, message: 'Reset token expired. Please start over.' });
    }

    if (decoded.purpose !== 'reset') return res.status(400).json({ success: false, message: 'Invalid reset token.' });

    const user = await User.findById(decoded.id).select('+otp +otpExpires');
    if (!user) return res.status(400).json({ success: false, message: 'User not found.' });

    user.password   = newPassword;
    user.otp        = undefined;
    user.otpExpires = undefined;
    user.otpType    = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
  } catch (err) { next(err); }
});

/* ─── REFRESH TOKEN ─── */
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ success: false, message: 'Refresh token required.' });

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token mismatch.' });
    }

    const newAccess  = signAccessToken(user._id);
    const newRefresh = signRefreshToken(user._id);
    user.refreshToken = newRefresh;
    await user.save();

    res.json({ success: true, accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) { next(err); }
});

/* ─── LOGOUT ─── */
router.post('/logout', protect, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ success: true, message: 'Logged out.' });
  } catch (err) { next(err); }
});

/* ─── ME ─── */
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;