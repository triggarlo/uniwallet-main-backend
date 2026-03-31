const router = require('express').Router();
const Notification = require('../models/Notification');
const { protect }  = require('../middleware/auth');

router.use(protect);

/* ─── GET ALL ─── */
router.get('/', async (req, res, next) => {
  try {
    const notifs = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
    res.json({ success: true, unreadCount, notifications: notifs });
  } catch (err) { next(err); }
});

/* ─── MARK ONE READ ─── */
router.patch('/:id/read', async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ─── MARK ALL READ ─── */
router.patch('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ─── DELETE ONE ─── */
router.delete('/:id', async (req, res, next) => {
  try {
    await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true });
  } catch (err) { next(err); }
});

/* ─── CLEAR ALL ─── */
router.delete('/', async (req, res, next) => {
  try {
    await Notification.deleteMany({ user: req.user._id });
    res.json({ success: true, message: 'All notifications cleared.' });
  } catch (err) { next(err); }
});

module.exports = router;