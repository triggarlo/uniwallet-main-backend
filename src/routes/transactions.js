const router = require('express').Router();
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

router.use(protect);

/* ─── GET ALL ─── */
router.get('/', async (req, res, next) => {
  try {
    const { month, cat, type, q } = req.query;
    const filter = { user: req.user._id };
    if (month) filter.date = { $regex: `^${month}` };
    if (cat)   filter.category = cat;
    if (type)  filter.type = type;
    if (q)     filter.$or = [
      { name:     { $regex: q, $options: 'i' } },
      { category: { $regex: q, $options: 'i' } },
    ];

    const txs = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });
    res.json({ success: true, transactions: txs });
  } catch (err) { next(err); }
});

/* ─── SUMMARY ─── */
router.get('/summary', async (req, res, next) => {
  try {
    const now   = new Date();
    const month = req.query.month ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const txs    = await Transaction.find({ user: req.user._id, date: { $regex: `^${month}` } });
    const spent  = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const budget = req.user.monthlyBudget;

    const byCategory = {};
    txs.filter(t => t.type === 'expense').forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });

    res.json({
      success: true, month, budget,
      spent, income,
      remaining: budget - spent,
      usedPct: Math.min(100, Math.round((spent / budget) * 100)),
      txCount: txs.filter(t => t.type === 'expense').length,
      byCategory,
    });
  } catch (err) { next(err); }
});

/* ─── EXPORT CSV ─── */
router.get('/export/csv', async (req, res, next) => {
  try {
    const txs = await Transaction.find({ user: req.user._id }).sort({ date: -1 });
    const rows = [
      ['Date', 'Time', 'Name', 'Category', 'Type', 'Amount'],
      ...txs.map(t => [t.date, t.time || '', `"${t.name}"`, t.category, t.type, t.amount]),
    ];
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="UniWallet.csv"');
    res.send(rows.map(r => r.join(',')).join('\n'));
  } catch (err) { next(err); }
});

/* ─── GET ONE ─── */
router.get('/:id', async (req, res, next) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found.' });
    res.json({ success: true, transaction: tx });
  } catch (err) { next(err); }
});

/* ─── CREATE ─── */
router.post('/', async (req, res, next) => {
  try {
    const { name, amount, type, date, category, emoji, note, time, recurring } = req.body;
    if (!name)   return res.status(422).json({ success: false, message: 'Name is required.' });
    if (!amount) return res.status(422).json({ success: false, message: 'Amount is required.' });
    if (!type)   return res.status(422).json({ success: false, message: 'Type is required.' });
    if (!date)   return res.status(422).json({ success: false, message: 'Date is required.' });

    const tx = await Transaction.create({
      user: req.user._id,
      name, amount, type, date,
      category: category || 'Other',
      emoji:    emoji    || '📌',
      note:     note     || '',
      time:     time     || '',
      recurring: recurring || false,
    });

    res.status(201).json({ success: true, transaction: tx });
  } catch (err) { next(err); }
});

/* ─── UPDATE ─── */
router.patch('/:id', async (req, res, next) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, user: req.user._id });
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found.' });
    const fields = ['name', 'amount', 'type', 'date', 'category', 'emoji', 'note', 'time', 'recurring'];
    fields.forEach(f => { if (req.body[f] !== undefined) tx[f] = req.body[f]; });
    await tx.save();
    res.json({ success: true, transaction: tx });
  } catch (err) { next(err); }
});

/* ─── DELETE ─── */
router.delete('/:id', async (req, res, next) => {
  try {
    const tx = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!tx) return res.status(404).json({ success: false, message: 'Transaction not found.' });
    res.json({ success: true, message: 'Transaction deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;