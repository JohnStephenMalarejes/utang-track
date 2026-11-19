import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  CalendarExpense,
  fetchCalendarExpenses,
  fetchLedgerData,
  getCurrentUser,
  hasAnyUsers,
  LocalUser,
  logoutUser,
} from '@/lib/actions';
import { buildLedger, Ledger, LedgerExpense, LedgerMember, LedgerPayment } from '@/lib/ledger';
import { hapticSuccess, hapticWarning } from '@/lib/haptics';

export interface PaymentFormPreset {
  payment?: LedgerPayment | null;
  shareId?: string | null;
  memberId?: string | null;
}

interface ToastState {
  id: number;
  text: string;
  tone: 'success' | 'error';
}

interface LedgerContextValue {
  user: LocalUser | null;
  authLoading: boolean;
  hasAccounts: boolean;
  setAuthenticatedUser: (user: LocalUser | null) => Promise<void>;
  signOut: () => Promise<void>;
  ledger: Ledger;
  calendarExpenses: CalendarExpense[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: (silent?: boolean) => Promise<void>;
  toast: ToastState | null;
  showToast: (text: string, tone?: 'success' | 'error') => void;
  // Modal states & openers
  expenseFormState: { open: boolean; expense: LedgerExpense | null };
  openExpenseForm: (expense?: LedgerExpense | null) => void;
  closeExpenseForm: () => void;
  expenseDetailState: { open: boolean; expenseId: string | null };
  openExpenseDetail: (expense: LedgerExpense) => void;
  closeExpenseDetail: () => void;
  memberFormState: { open: boolean; member: LedgerMember | null };
  openMemberForm: (member?: LedgerMember | null) => void;
  closeMemberForm: () => void;
  paymentFormState: { open: boolean; preset: PaymentFormPreset | null };
  openPaymentForm: (preset?: PaymentFormPreset | null) => void;
  closePaymentForm: () => void;
  createSheetOpen: boolean;
  setCreateSheetOpen: (open: boolean) => void;
}

const emptyLedger = buildLedger({});

const LedgerContext = createContext<LedgerContextValue | null>(null);

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [hasAccounts, setHasAccounts] = useState(false);

  const [ledger, setLedger] = useState<Ledger>(emptyLedger);
  const [calendarExpenses, setCalendarExpenses] = useState<CalendarExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [expenseFormState, setExpenseFormState] = useState<{ open: boolean; expense: LedgerExpense | null }>({
    open: false,
    expense: null,
  });
  const [expenseDetailState, setExpenseDetailState] = useState<{ open: boolean; expenseId: string | null }>({
    open: false,
    expenseId: null,
  });
  const [memberFormState, setMemberFormState] = useState<{ open: boolean; member: LedgerMember | null }>({
    open: false,
    member: null,
  });
  const [paymentFormState, setPaymentFormState] = useState<{ open: boolean; preset: PaymentFormPreset | null }>({
    open: false,
    preset: null,
  });
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const showToast = useCallback((text: string, tone: 'success' | 'error' = 'success') => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    if (tone === 'error') hapticWarning();
    else hapticSuccess();
    setToast({ id: Date.now(), text, tone });
    toastTimer.current = setTimeout(() => {
      setToast(null);
    }, 3200);
  }, []);

  const refresh = useCallback(async (silent = false, explicitUserId?: string) => {
    if (!silent) setRefreshing(true);
    try {
      const [data, calRows] = await Promise.all([
        fetchLedgerData(explicitUserId),
        fetchCalendarExpenses(explicitUserId),
      ]);
      setLedger(data);
      setCalendarExpenses(calRows);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load SQLite ledger data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [activeUser, accountsExist] = await Promise.all([getCurrentUser(), hasAnyUsers()]);
        if (!mounted) return;
        setUser(activeUser);
        setHasAccounts(accountsExist);
        setAuthLoading(false);
        if (activeUser) {
          await refresh(true, activeUser.id);
        } else {
          setLedger(emptyLedger);
          setCalendarExpenses([]);
          setLoading(false);
        }
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Unable to initialize SQLite database');
        setAuthLoading(false);
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [refresh]);

  const setAuthenticatedUser = useCallback(
    async (nextUser: LocalUser | null) => {
      setUser(nextUser);
      if (nextUser) {
        setHasAccounts(true);
        setLoading(true);
        await refresh(true, nextUser.id);
      } else {
        setLedger(emptyLedger);
        setCalendarExpenses([]);
        setLoading(false);
      }
    },
    [refresh]
  );

  const signOut = useCallback(async () => {
    await logoutUser();
    setUser(null);
    setLedger(emptyLedger);
    setCalendarExpenses([]);
  }, []);

  const openExpenseForm = useCallback((expense: LedgerExpense | null = null) => {
    setExpenseFormState({ open: true, expense });
  }, []);

  const closeExpenseForm = useCallback(() => {
    setExpenseFormState({ open: false, expense: null });
  }, []);

  const openExpenseDetail = useCallback((expense: LedgerExpense) => {
    setExpenseDetailState({ open: true, expenseId: expense.id });
  }, []);

  const closeExpenseDetail = useCallback(() => {
    setExpenseDetailState({ open: false, expenseId: null });
  }, []);

  const openMemberForm = useCallback((member: LedgerMember | null = null) => {
    setMemberFormState({ open: true, member });
  }, []);

  const closeMemberForm = useCallback(() => {
    setMemberFormState({ open: false, member: null });
  }, []);

  const openPaymentForm = useCallback((preset: PaymentFormPreset | null = null) => {
    setPaymentFormState({ open: true, preset });
  }, []);

  const closePaymentForm = useCallback(() => {
    setPaymentFormState({ open: false, preset: null });
  }, []);

  return (
    <LedgerContext.Provider
      value={{
        user,
        authLoading,
        hasAccounts,
        setAuthenticatedUser,
        signOut,
        ledger,
        calendarExpenses,
        loading,
        refreshing,
        error,
        refresh,
        toast,
        showToast,
        expenseFormState,
        openExpenseForm,
        closeExpenseForm,
        expenseDetailState,
        openExpenseDetail,
        closeExpenseDetail,
        memberFormState,
        openMemberForm,
        closeMemberForm,
        paymentFormState,
        openPaymentForm,
        closePaymentForm,
        createSheetOpen,
        setCreateSheetOpen,
      }}>
      {children}
    </LedgerContext.Provider>
  );
}

export function useLedger() {
  const ctx = useContext(LedgerContext);
  if (!ctx) throw new Error('useLedger must be used inside LedgerProvider');
  return ctx;
}
