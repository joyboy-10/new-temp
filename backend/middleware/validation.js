const { z } = require('zod');

const txSchema = z.object({
  receiver: z.string().min(1),
  amountEther: z.string().min(1),
  purpose: z.string().min(1),
  comment: z.string().optional(),
  deadline: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional()
});

const validateTransactionCreation = (req, res, next) => {
  const parsed = txSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid transaction payload' });
  }
  next();
};

module.exports = { validateTransactionCreation };
