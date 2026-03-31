const router = require('express').Router();
const User   = require('../models/User');
const { protect } = require('../middleware/auth');

router.use(protect);

/* ─── GET PROFILE ─── */
router.get('/profile', (req, res) => {
  res.json({ success: true, user: req.user });
});

/* ─── UPDATE PROFILE ─── */
router.patch('/profile', async (req, res, next) => {
  try {
    const { name, email, university, level, bio } = req.body;
    const user = await User.findById(req.user._id);

    if (name)       user.name       = name;
    if (university !== undefined) user.university = university;
    if (level      !== undefined) user.level      = level;
    if (bio        !== undefined) user.bio        = bio;

    if (email && email !== user.email) {
      const taken = await User.findOne({ email });
      if (taken) return res.status(409).json({ success: false, message: 'Email already in use.' });
      user.email = email;
    }

    await user.save();
    res.json({ success: true, user });
  } catch (err) { next(err); }
});

/* ─── UPDATE BUDGET ─── */
router.patch('/budget', async (req, res, next) => {
  try {
    const { monthlyBudget } = req.body;
    if (!monthlyBudget || monthlyBudget < 1000) {
      return res.status(422).json({ success: false, message: 'Budget must be at least ₦1,000.' });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { monthlyBudget },
      { new: true }
    );
    res.json({ success: true, monthlyBudget: user.monthlyBudget });
  } catch (err) { next(err); }
});

/* ─── UPDATE PREFERENCES ─── */
router.patch('/preferences', async (req, res, next) => {
  try {
    const allowed = ['darkMode', 'survivalMode', 'goalAlerts'];
    const updates = {};
    allowed.forEach(key => {
      if (typeof req.body[key] === 'boolean') {
        updates[`prefs.${key}`] = req.body[key];
      }
    });
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true }
    );
    res.json({ success: true, prefs: user.prefs });
  } catch (err) { next(err); }
});

/* ─── CHANGE PASSWORD ─── */
router.patch('/change-password', async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(422).json({ success: false, message: 'Both passwords required.' });
    }
    if (newPassword.length < 6) {
      return res.status(422).json({ success: false, message: 'New password must be at least 6 characters.' });
    }
    const user = await User.findById(req.user._id).select('+password');
    const match = await user.comparePassword(currentPassword);
    if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) { next(err); }
});

module.exports = router;