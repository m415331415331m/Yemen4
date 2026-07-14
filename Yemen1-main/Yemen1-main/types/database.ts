export type ServiceProvider = {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  type: 'mobile' | 'internet' | 'electricity' | 'water' | 'fuel';
  icon_name: string;
  brand_color: string;
  is_active: boolean;
  sort_order: number;
  phone_prefixes: string[];
  ussd_balance: string | null;
  ussd_loan: string | null;
  governorate_id: string | null;
};

export type Governorate = {
  id: string;
  name_ar: string;
  name_en: string | null;
  code: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type AdminUser = {
  id: string;
  username: string;
  password_hash: string;
  display_name: string | null;
  role: 'admin' | 'super_admin';
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
};

export type AdminActivity = {
  id: string;
  admin_id: string | null;
  admin_username: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type PackageDuration = 'daily' | 'weekly' | 'monthly' | 'max';

export type ProviderPackage = {
  id: string;
  provider_id: string;
  name_ar: string;
  amount: number;
  description_ar: string | null;
  is_active: boolean;
  sort_order: number;
  duration_type: PackageDuration;
  data_mb: number | null;
  minutes: number | null;
  sms: number | null;
  validity_days: number | null;
};

export type ApiSetting = {
  id: string;
  provider_id: string;
  api_url: string | null;
  api_key: string | null;
  api_token: string | null;
  api_secret: string | null;
  merchant_id: string | null;
  additional_config: Record<string, unknown>;
  is_active: boolean;
  updated_at: string;
};

export type TransactionStatus = 'pending' | 'success' | 'failed';
export type TransactionType = 'recharge' | 'balance_inquiry' | 'bill_payment' | 'fuel_payment';

export type Transaction = {
  id: string;
  provider_id: string;
  phone_number: string;
  customer_name: string | null;
  amount: number;
  package_code: string | null;
  status: TransactionStatus;
  transaction_type: TransactionType;
  provider_transaction_id: string | null;
  provider_response: Record<string, unknown> | null;
  receipt_number: string | null;
  error_message: string | null;
  client_token: string | null;
  balance_before: number | null;
  balance_after: number | null;
  loan_amount: number | null;
  total_amount: number | null;
  created_at: string;
  completed_at: string | null;
};

export type TransactionWithProvider = Transaction & {
  service_providers?: ServiceProvider;
};

export type DebtPersonType = 'i_owe' | 'owed_to_me';
export type DebtCategory = 'grocery' | 'house' | 'personal' | 'loan' | 'fuel' | 'other';
export type DebtStatus = 'active' | 'paid' | 'overdue';

export type Debt = {
  id: string;
  client_token: string;
  person_name: string;
  person_type: DebtPersonType;
  amount: number;
  paid_amount: number;
  installments_count: number;
  installments_paid: number;
  installment_amount: number;
  due_date: string | null;
  category: DebtCategory;
  notes: string | null;
  status: DebtStatus;
  created_at: string;
  updated_at: string;
};

export type DebtReminder = {
  id: string;
  client_token: string;
  title: string;
  amount: number;
  place: string | null;
  due_date: string | null;
  is_paid: boolean;
  created_at: string;
};

export type ExpenseCategory = 'food' | 'transport' | 'fuel' | 'bills' | 'health' | 'shopping' | 'debt_payment' | 'other';

export type Expense = {
  id: string;
  client_token: string;
  amount: number;
  category: ExpenseCategory;
  description: string | null;
  expense_date: string;
  created_at: string;
};

export type IncomeType = 'monthly_salary' | 'daily' | 'freelance' | 'business' | 'other';

export type Income = {
  id: string;
  client_token: string;
  amount: number;
  source: string;
  income_type: IncomeType;
  income_date: string;
  notes: string | null;
  governorate_id: string | null;
  created_at: string;
};

export type FuelStation = {
  id: string;
  name_ar: string;
  name_en: string | null;
  code: string;
  brand_color: string;
  is_active: boolean;
  sort_order: number;
  governorate_id: string | null;
  created_at: string;
};
