import { createSalt, hashPassword } from './crypto';
import { todayISO } from './dates';
import { buildLedger, Ledger, RawExpense, RawExpenseShare, RawMember, RawPayment } from './ledger';
import { centsToDecimal, formatPHP, parseAmount, toCents } from './money';
import {
  calendarExpenseSchema,
  expenseSchema,
  firstError,
  loginSchema,
  memberSchema,
  paymentSchema,
  registerSchema,
} from './schemas';
import { generateUuid, getDb } from './sqlite';

export interface LocalUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
  code?: string;
  count?: number;
  user?: LocalUser;
}

export function friendlyError(error: any): string {
  const message = String(error?.message || error || 'Something went wrong');
  const lower = message.toLowerCase();
  if (lower.includes('foreign key constraint failed')) {
    return "This record is still in use by other records, so it can't be removed.";
  }
  if (lower.includes('unique constraint failed')) {
    return 'A record with the same name already exists.';
  }
  if (lower.includes('check constraint failed')) {
    return 'One of the values is outside the allowed range.';
  }
  return message;
}

const fail = (error: any, extra: Partial<ActionResult> = {}): ActionResult => ({
  ok: false,
  error: typeof error === 'string' ? error : friendlyError(error),
  ...extra,
});

const succeed = (extra: Partial<ActionResult> = {}): ActionResult => ({
  ok: true,
  ...extra,
});

/* ------------------------------------------------------------------ */
/* Local SQLite Authentication                                         */
/* ------------------------------------------------------------------ */

export async function getCurrentUser(): Promise<LocalUser | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    id: string;
    name: string;
    email: string;
    created_at: string;
  }>(
    `SELECT u.id, u.name, u.email, u.created_at
       FROM auth_session s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = 1`
  );
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at,
  };
}

export async function hasAnyUsers(): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM users');
  return Number(row?.count ?? 0) > 0;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed));
  const { name, email, password } = parsed.data;
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const now = new Date().toISOString();

  try {
    const db = await getDb();
    const existing = await db.getFirstAsync<{ id: string }>(
      'SELECT id FROM users WHERE lower(trim(email)) = ?',
      cleanEmail
    );
    if (existing) {
      return fail('An account with this email already exists.');
    }

    const userCountRow = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM users'
    );
    const isFirstUser = Number(userCountRow?.count ?? 0) === 0;

    const userId = generateUuid();
    const salt = createSalt();
    const passwordHash = hashPassword(password, salt);

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO users (id, name, email, password_hash, salt, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        userId,
        cleanName,
        cleanEmail,
        passwordHash,
        salt,
        now,
        now
      );

      // Adopt any existing pre-auth local rows if this is the very first user.
      if (isFirstUser) {
        await db.runAsync('UPDATE members SET user_id = ? WHERE user_id IS NULL', userId);
        await db.runAsync('UPDATE expenses SET user_id = ? WHERE user_id IS NULL', userId);
        await db.runAsync('UPDATE payments SET user_id = ? WHERE user_id IS NULL', userId);
      }

      await db.runAsync(
        'INSERT OR REPLACE INTO auth_session (id, user_id, created_at) VALUES (1, ?, ?)',
        userId,
        now
      );
    });

    return succeed({
      user: {
        id: userId,
        name: cleanName,
        email: cleanEmail,
        createdAt: now,
      },
    });
  } catch (err: any) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('unique constraint failed')) {
      return fail('An account with this email already exists.');
    }
    return fail(err);
  }
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed));
  const cleanEmail = parsed.data.email.trim().toLowerCase();
  const { password } = parsed.data;
  const now = new Date().toISOString();

  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{
      id: string;
      name: string;
      email: string;
      password_hash: string;
      salt: string;
      created_at: string;
    }>(
      'SELECT id, name, email, password_hash, salt, created_at FROM users WHERE lower(trim(email)) = ?',
      cleanEmail
    );

    if (!row || hashPassword(password, row.salt) !== row.password_hash) {
      return fail('Incorrect email or password.');
    }

    await db.runAsync(
      'INSERT OR REPLACE INTO auth_session (id, user_id, created_at) VALUES (1, ?, ?)',
      row.id,
      now
    );

    return succeed({
      user: {
        id: row.id,
        name: row.name,
        email: row.email,
        createdAt: row.created_at,
      },
    });
  } catch (err) {
    return fail(err);
  }
}

export async function logoutUser(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM auth_session WHERE id = 1');
}

async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new Error('Your session has expired. Please sign in again.');
  return user.id;
}

/* ------------------------------------------------------------------ */
/* Ledger Queries & Mutations                                          */
/* ------------------------------------------------------------------ */

export async function fetchLedgerData(userId?: string): Promise<Ledger> {
  const db = await getDb();
  const activeUserId = userId ?? (await getCurrentUser())?.id;
  if (!activeUserId) return buildLedger({});

  const [members, expenses, shares, payments] = await Promise.all([
    db.getAllAsync<RawMember>(
      'SELECT * FROM members WHERE user_id = ? ORDER BY lower(trim(name)) ASC, id ASC',
      activeUserId
    ),
    db.getAllAsync<RawExpense>(
      'SELECT * FROM expenses WHERE user_id = ? ORDER BY expense_date DESC, created_at DESC, id ASC',
      activeUserId
    ),
    db.getAllAsync<RawExpenseShare>(
      `SELECT es.*
         FROM expense_shares es
         JOIN expenses e ON e.id = es.expense_id
        WHERE e.user_id = ?`,
      activeUserId
    ),
    db.getAllAsync<RawPayment>(
      'SELECT * FROM payments WHERE user_id = ? ORDER BY payment_date DESC, created_at DESC, id ASC',
      activeUserId
    ),
  ]);

  const sharesByExpense = new Map<string, RawExpenseShare[]>();
  for (const s of shares) {
    const list = sharesByExpense.get(s.expense_id);
    if (list) list.push(s);
    else sharesByExpense.set(s.expense_id, [s]);
  }

  const hydratedExpenses: RawExpense[] = expenses.map((e) => ({
    ...e,
    expense_shares: sharesByExpense.get(e.id) || [],
  }));

  return buildLedger({ members, expenses: hydratedExpenses, payments });
}

export async function saveMember(input: {
  id?: string;
  name: string;
  contact?: string;
  notes?: string;
}): Promise<ActionResult> {
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed));
  const { id, name, contact, notes } = parsed.data;
  const now = new Date().toISOString();

  try {
    const userId = await requireUserId();
    const db = await getDb();
    if (id) {
      await db.runAsync(
        'UPDATE members SET name = ?, contact = ?, notes = ?, updated_at = ? WHERE id = ? AND user_id = ?',
        name,
        contact || null,
        notes || null,
        now,
        id,
        userId
      );
    } else {
      await db.runAsync(
        'INSERT INTO members (id, user_id, name, contact, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        generateUuid(),
        userId,
        name,
        contact || null,
        notes || null,
        now,
        now
      );
    }
    return succeed();
  } catch (err: any) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('unique constraint failed')) {
      return fail('A member with this name already exists.');
    }
    return fail(err);
  }
}

export async function deleteMember(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const db = await getDb();
    await db.runAsync('DELETE FROM members WHERE id = ? AND user_id = ?', id, userId);
    return succeed();
  } catch (err: any) {
    const msg = String(err?.message || '').toLowerCase();
    if (msg.includes('foreign key constraint failed')) {
      return fail('This member still has expenses or payments. Remove those records first.');
    }
    return fail(err);
  }
}

export async function saveExpense(input: {
  id?: string;
  description: string;
  category: string;
  total_amount: string;
  expense_date: string;
  paid_by?: string;
  notes?: string;
  shares: { member_id: string; share_amount: string }[];
}): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed));
  const v = parsed.data;
  const now = new Date().toISOString();

  const description = v.description.trim();
  const totalAmount = centsToDecimal(parseAmount(v.total_amount)!);
  const paidBy = v.paid_by || null;
  const notes = v.notes?.trim() ? v.notes.trim() : null;

  try {
    const userId = await requireUserId();
    const db = await getDb();
    let blockedReason: string | null = null;

    await db.withTransactionAsync(async () => {
      if (!v.id) {
        const expenseId = generateUuid();
        await db.runAsync(
          `INSERT INTO expenses (id, user_id, description, category, total_amount, expense_date, paid_by, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          expenseId,
          userId,
          description,
          v.category,
          totalAmount,
          v.expense_date,
          paidBy,
          notes,
          now,
          now
        );

        for (const s of v.shares) {
          await db.runAsync(
            `INSERT INTO expense_shares (id, expense_id, member_id, share_amount, settled_amount, created_at, updated_at)
             VALUES (?, ?, ?, ?, 0, ?, ?)`,
            generateUuid(),
            expenseId,
            s.member_id,
            centsToDecimal(parseAmount(s.share_amount)!),
            now,
            now
          );
        }
        return;
      }

      const existingShares = await db.getAllAsync<{
        id: string;
        member_id: string;
        member_name: string | null;
        payment_count: number;
      }>(
        `SELECT es.id, es.member_id, m.name AS member_name, COUNT(p.id) AS payment_count
           FROM expense_shares es
           LEFT JOIN members m ON m.id = es.member_id
           LEFT JOIN payments p ON p.expense_share_id = es.id
          WHERE es.expense_id = ?
          GROUP BY es.id`,
        v.id
      );

      const keepMemberIds = new Set(v.shares.map((s) => s.member_id));
      const removedWithPayments = existingShares.filter(
        (es) => !keepMemberIds.has(es.member_id) && Number(es.payment_count) > 0
      );
      if (removedWithPayments.length > 0) {
        const names = removedWithPayments.map((es) => es.member_name ?? 'member').join(', ');
        blockedReason = `Cannot remove participant(s) who already have payments: ${names}. Delete those payments first.`;
        throw new Error(blockedReason);
      }

      if (paidBy) {
        const payerShare = existingShares.find((es) => es.member_id === paidBy);
        if (payerShare && Number(payerShare.payment_count) > 0) {
          blockedReason =
            'The selected payer already has payments recorded on this expense. Delete those payments first.';
          throw new Error(blockedReason);
        }
      }

      await db.runAsync(
        `UPDATE expenses
            SET description = ?, category = ?, total_amount = ?, expense_date = ?, paid_by = ?, notes = ?, updated_at = ?
          WHERE id = ? AND user_id = ?`,
        description,
        v.category,
        totalAmount,
        v.expense_date,
        paidBy,
        notes,
        now,
        v.id,
        userId
      );

      for (const es of existingShares) {
        if (!keepMemberIds.has(es.member_id)) {
          await db.runAsync('DELETE FROM expense_shares WHERE id = ?', es.id);
        }
      }

      for (const s of v.shares) {
        await db.runAsync(
          `INSERT INTO expense_shares (id, expense_id, member_id, share_amount, settled_amount, created_at, updated_at)
           VALUES (?, ?, ?, ?, 0, ?, ?)
           ON CONFLICT(expense_id, member_id)
           DO UPDATE SET share_amount = excluded.share_amount, updated_at = excluded.updated_at`,
          generateUuid(),
          v.id,
          s.member_id,
          centsToDecimal(parseAmount(s.share_amount)!),
          now,
          now
        );
      }
    });

    if (blockedReason) return fail(blockedReason);
    return succeed();
  } catch (err) {
    return fail(err);
  }
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const db = await getDb();
    await db.runAsync('DELETE FROM expenses WHERE id = ? AND user_id = ?', id, userId);
    return succeed();
  } catch (err) {
    return fail(err);
  }
}

async function loadShare(shareId: string, ignorePaymentId?: string) {
  const db = await getDb();
  const share = await db.getFirstAsync<{
    id: string;
    member_id: string;
    share_amount: number | string;
    paid_by: string | null;
  }>(
    `SELECT es.id, es.member_id, es.share_amount, e.paid_by
       FROM expense_shares es
       JOIN expenses e ON e.id = es.expense_id
      WHERE es.id = ?`,
    shareId
  );
  if (!share) return null;

  const existing = await db.getAllAsync<{ id: string; amount: number | string }>(
    'SELECT id, amount FROM payments WHERE expense_share_id = ?',
    shareId
  );

  const paidCents = existing
    .filter((p) => p.id !== ignorePaymentId)
    .reduce((sum, p) => sum + toCents(p.amount), 0);

  return {
    memberId: share.member_id,
    owedCents: toCents(share.share_amount),
    isPayer: Boolean(share.paid_by) && share.paid_by === share.member_id,
    remainingCents: toCents(share.share_amount) - paidCents,
  };
}

export async function savePayment(input: {
  id?: string;
  member_id: string;
  expense_share_id: string;
  amount: string;
  payment_date: string;
  notes?: string;
  confirmOverpay?: boolean;
}): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed));
  const v = parsed.data;
  const amountCents = parseAmount(v.amount)!;
  const now = new Date().toISOString();

  try {
    const userId = await requireUserId();
    const share = await loadShare(v.expense_share_id, v.id);
    if (!share) return fail('That expense share no longer exists.');
    if (share.memberId !== v.member_id) return fail('The selected expense does not belong to this member.');
    if (share.isPayer) return fail("The person who paid the bill doesn't owe their own share.");

    if (amountCents > share.remainingCents && !v.confirmOverpay) {
      return fail(
        `This is more than the remaining balance of ${formatPHP(Math.max(share.remainingCents, 0))}. Confirm the overpayment to continue.`,
        { code: 'OVERPAY' }
      );
    }

    const db = await getDb();
    if (v.id) {
      await db.runAsync(
        `UPDATE payments
            SET member_id = ?, expense_share_id = ?, amount = ?, payment_date = ?, notes = ?, updated_at = ?
          WHERE id = ? AND user_id = ?`,
        v.member_id,
        v.expense_share_id,
        centsToDecimal(amountCents),
        v.payment_date,
        v.notes || null,
        now,
        v.id,
        userId
      );
    } else {
      await db.runAsync(
        `INSERT INTO payments (id, user_id, member_id, expense_share_id, amount, payment_date, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        generateUuid(),
        userId,
        v.member_id,
        v.expense_share_id,
        centsToDecimal(amountCents),
        v.payment_date,
        v.notes || null,
        now,
        now
      );
    }
    return succeed();
  } catch (err) {
    return fail(err);
  }
}

export async function deletePayment(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const db = await getDb();
    await db.runAsync('DELETE FROM payments WHERE id = ? AND user_id = ?', id, userId);
    return succeed();
  } catch (err) {
    return fail(err);
  }
}

async function settleShares(shareIds: string[], date: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const now = new Date().toISOString();
    const rows: {
      id: string;
      member_id: string;
      expense_share_id: string;
      amount: string;
      payment_date: string;
      notes: string;
    }[] = [];

    for (const id of shareIds) {
      const share = await loadShare(id);
      if (share && !share.isPayer && share.remainingCents > 0) {
        rows.push({
          id: generateUuid(),
          member_id: share.memberId,
          expense_share_id: id,
          amount: centsToDecimal(share.remainingCents),
          payment_date: date,
          notes: 'Marked as fully settled',
        });
      }
    }

    if (rows.length === 0) return fail('Nothing is outstanding here.');

    const db = await getDb();
    await db.withTransactionAsync(async () => {
      for (const r of rows) {
        await db.runAsync(
          `INSERT INTO payments (id, user_id, member_id, expense_share_id, amount, payment_date, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          r.id,
          userId,
          r.member_id,
          r.expense_share_id,
          r.amount,
          r.payment_date,
          r.notes,
          now,
          now
        );
      }
    });

    return succeed({ count: rows.length });
  } catch (err) {
    return fail(err);
  }
}

export async function settleShare(shareId: string, date = todayISO()): Promise<ActionResult> {
  return settleShares([shareId], date);
}

export async function settleMember(memberId: string, date = todayISO()): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const db = await getDb();
    const data = await db.getAllAsync<{ id: string }>(
      `SELECT es.id
         FROM expense_shares es
         JOIN expenses e ON e.id = es.expense_id
        WHERE es.member_id = ? AND e.user_id = ?`,
      memberId,
      userId
    );
    return settleShares(
      data.map((s) => s.id),
      date
    );
  } catch (err) {
    return fail(err);
  }
}

/* ------------------------------------------------------------------ */
/* Calendar Daily Expenses                                             */
/* ------------------------------------------------------------------ */

export interface CalendarExpense {
  id: string;
  name: string;
  amountCents: number;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchCalendarExpenses(userId?: string): Promise<CalendarExpense[]> {
  const db = await getDb();
  const activeUserId = userId ?? (await getCurrentUser())?.id;
  if (!activeUserId) return [];

  const rows = await db.getAllAsync<{
    id: string;
    name: string;
    amount: number | string;
    expense_date: string;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, name, amount, expense_date, created_at, updated_at
       FROM calendar_expenses
      WHERE user_id = ?
      ORDER BY expense_date DESC, created_at ASC, id ASC`,
    activeUserId
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    amountCents: toCents(r.amount),
    date: r.expense_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function saveCalendarExpense(input: {
  id?: string;
  name: string;
  amount: string;
  expense_date: string;
}): Promise<ActionResult> {
  const parsed = calendarExpenseSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed));
  const v = parsed.data;
  const amountCents = parseAmount(v.amount)!;
  const now = new Date().toISOString();

  try {
    const userId = await requireUserId();
    const db = await getDb();
    if (v.id) {
      await db.runAsync(
        `UPDATE calendar_expenses
            SET name = ?, amount = ?, expense_date = ?, updated_at = ?
          WHERE id = ? AND user_id = ?`,
        v.name.trim(),
        centsToDecimal(amountCents),
        v.expense_date,
        now,
        v.id,
        userId
      );
    } else {
      await db.runAsync(
        `INSERT INTO calendar_expenses (id, user_id, name, amount, expense_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        generateUuid(),
        userId,
        v.name.trim(),
        centsToDecimal(amountCents),
        v.expense_date,
        now,
        now
      );
    }
    return succeed();
  } catch (err) {
    return fail(err);
  }
}

export async function deleteCalendarExpense(id: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const db = await getDb();
    await db.runAsync('DELETE FROM calendar_expenses WHERE id = ? AND user_id = ?', id, userId);
    return succeed();
  } catch (err) {
    return fail(err);
  }
}

/* ------------------------------------------------------------------ */
/* App Preferences (Theme, UI Settings)                                */
/* ------------------------------------------------------------------ */

export async function getAppPreference(key: string): Promise<string | null> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_preferences WHERE key = ?',
      key
    );
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function setAppPreference(key: string, value: string): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO app_preferences (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      key,
      value,
      new Date().toISOString()
    );
  } catch {
    // non-fatal preference write failure
  }
}
