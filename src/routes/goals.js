const router = require('express').Router();
const Goal        = require('../models/Goal');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

router.use(protect);

const syncGoals = async (userId) => {
  const goals = await Goal.find({ user: userId });
  if (!goals.length) return goals;
  const now    = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const txs    = await Transaction.find({ user: userId, type: 'expense', date: { $regex: `^${prefix}` } });
  const total  = txs.reduce((s, t) => s + t.amount, 0);
  for (const goal of goals) {
    goal.spent = goal.isOverall
      ? total
      : txs.filter(t => t.category === goal.category).reduce((s, t) => s + t.amount, 0);
    await goal.save();
  }
  return goals;
};

router.get('/', async (req, res, next) => {
  try {
    const goals = await Goal.find({ user: req.user._id }).sort({ createdAt: 1 });
    res.json({ success: true, goals });
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, limit, category, isOverall } = req.body;
    if (!name)  return res.status(422).json({ success: false, message: 'Name is required.' });
    if (!limit) return res.status(422).json({ success: false, message: 'Limit is required.' });
    const exists = await Goal.findOne({ user: req.user._id, name });
    if (exists) return res.status(409).json({ success: false, message: 'Goal already exists.' });
    const goal = await Goal.create({
      user: req.user._id, name, limit,
      category: category || name.split(' ')[0],
      isOverall: isOverall || false,
    });
    await syncGoals(req.user._id);
    const updated = await Goal.findById(goal._id);
    res.status(201).json({ success: true, goal: updated });
  } catch (err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found.' });
    if (req.body.name  !== undefined) goal.name  = req.body.name;
    if (req.body.limit !== undefined) goal.limit = req.body.limit;
    await goal.save();
    res.json({ success: true, goal });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found.' });
    res.json({ success: true, message: 'Goal deleted.' });
  } catch (err) { next(err); }
});

router.post('/sync', async (req, res, next) => {
  try {
    const goals = await syncGoals(req.user._id);
    res.json({ success: true, goals });
  } catch (err) { next(err); }
});

module.exports = { router, syncGoals };