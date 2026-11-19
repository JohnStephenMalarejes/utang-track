import { z } from 'zod';
import { CATEGORIES } from './constants';
import { parseAmount } from './money';

const uuid = z.string().uuid('Make a valid selection');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a valid date');
const text = (max: number, label = 'Text') =>
  z.string().trim().max(max, `${label} must be ${max} characters or fewer`).default('');

const positiveAmount = z.string().refine((v) => {
  const cents = parseAmount(v);
  return cents !== null && cents > 0;
}, 'Enter an amount above ₱0.00 with at most 2 decimals');

export const memberSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "Enter the member's name").max(120, 'Name must be 120 characters or fewer'),
  contact: text(200, 'Contact'),
  notes: text(1000, 'Notes'),
});

export const expenseSchema = z
  .object({
    id: uuid.optional(),
    description: z.string().trim().min(1, 'Enter a description').max(200, 'Description must be 200 characters or fewer'),
    category: z.enum(CATEGORIES, { errorMap: () => ({ message: 'Select a category' }) }),
    total_amount: positiveAmount,
    expense_date: isoDate,
    paid_by: z.union([uuid, z.literal('')]).default(''),
    notes: text(1000, 'Notes'),
    shares: z
      .array(z.object({ member_id: uuid, share_amount: positiveAmount }))
      .min(1, 'Select at least one participant'),
  })
  .superRefine((value, ctx) => {
    const ids = value.shares.map((s) => s.member_id);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({ code: 'custom', path: ['shares'], message: 'A participant was added more than once' });
      return;
    }
    const total = parseAmount(value.total_amount);
    const sum = value.shares.reduce((acc, s) => acc + (parseAmount(s.share_amount) ?? 0), 0);
    if (total !== null && sum > total) {
      ctx.addIssue({
        code: 'custom',
        path: ['shares'],
        message: 'The individual shares cannot exceed the expense total',
      });
    }
  });

export const paymentSchema = z.object({
  id: uuid.optional(),
  member_id: uuid,
  expense_share_id: uuid,
  amount: positiveAmount,
  payment_date: isoDate,
  notes: text(1000, 'Notes'),
  confirmOverpay: z.boolean().default(false),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter your full name').max(120, 'Name must be 120 characters or fewer'),
    email: z.string().trim().email('Enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters').max(128, 'Password is too long'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const calendarExpenseSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, 'Enter the expense name').max(200, 'Name must be 200 characters or fewer'),
  amount: positiveAmount,
  expense_date: isoDate,
});

export function firstError(result: { error: { issues: { message?: string }[] } }): string {
  return result.error.issues[0]?.message ?? 'Please check the form and try again';
}
