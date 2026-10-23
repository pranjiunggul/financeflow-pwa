export type CurrencyCode = string; // 'IDR' | 'USD' | 'EUR' | 'SGD' | etc.

export type AccountType = 'cash' | 'bank' | 'ewallet' | 'paypal' | 'investment' | 'credit_card';

export interface Account {
  id: string;                 // UUID v4
  name: string;               // e.g. "BCA Checking", "Dompet Tunai", "PayPal USD"
  type: AccountType;
  currency: CurrencyCode;     // e.g. 'IDR', 'USD'
  initialBalance: number;     // Starting balance in account currency
  currentBalance: number;     // Cached calculated balance in account currency
  icon: string;               // Lucide icon name, e.g. 'Wallet', 'Landmark', 'CreditCard'
  color: string;              // Hex string e.g. '#3b82f6'
  includeInNetWorth: boolean; // Whether to include in aggregate net worth
  monthlyAdminFee?: {
    enabled: boolean;
    amount: number;
    dayOfMonth: number;       // 1 - 31
    categoryId?: string;
    autoPost: boolean;        // true = automatically post, false = prompt notification
  };
  createdAt: number;          // Epoch timestamp ms
  updatedAt: number;          // Epoch timestamp ms for sync LWW
  deviceId: string;           // Device identifier
  isDeleted: boolean;         // Soft delete
  version: number;
}

export type CategoryType = 'expense' | 'income' | 'both';

export interface Category {
  id: string;
  name: string;               // e.g. "Food & Beverage", "Salary", "Transport", "Transfer Fee"
  type: CategoryType;
  icon: string;               // Lucide icon name e.g. 'Utensils', 'Briefcase', 'Car'
  color: string;              // Hex string e.g. '#ef4444'
  parentId?: string;          // For subcategories
  isSystem: boolean;          // Transfer, Debt, Fees cannot be hard-deleted
  budgetMonthly?: number;     // Optional monthly budget limit in user base currency
  createdAt: number;
  updatedAt: number;
  deviceId: string;
  isDeleted: boolean;
  version: number;
}

export type TransactionType = 'income' | 'expense' | 'transfer' | 'debt' | 'receivable';

export interface TransferMeta {
  toAccountId: string;        // Destination account
  toAmount: number;           // Amount credited to destination account (in toAccount currency)
  toCurrency: CurrencyCode;
  feeAmount?: number;         // Optional transfer fee deducted from source
  feeCategoryId?: string;     // Category assigned for the fee (e.g. 'transfer_fee')
}

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string;               // YYYY-MM-DD
  time?: string;              // HH:mm
  timestamp: number;          // Epoch ms for exact chronological sorting

  // Monetary details
  amount: number;             // In transaction currency
  currency: CurrencyCode;     // Currency of this transaction
  exchangeRateToBase: number; // Conversion rate to base currency (baseAmount = amount * exchangeRateToBase)
  baseAmount: number;         // Amount normalized to base reporting currency

  // Account & Category linkages
  accountId: string;          // Source account
  categoryId: string;

  // Notes & metadata
  description: string;
  tags?: string[];

  // Transfer specifics
  transferMeta?: TransferMeta;

  // Debt/Receivable linkages
  debtReceivableId?: string;  // If linked to debt/receivable master record
  debtRepaymentType?: 'principal' | 'interest' | 'fee';

  // Attachments & OCR metadata
  receiptUrl?: string;
  receiptHash?: string;       // SHA-256 for duplicate check
  rawOcrText?: string;
  inputSource: 'manual' | 'ocr' | 'telegram' | 'voice' | 'recurring' | 'ai';

  // Sync & Audit
  createdAt: number;
  updatedAt: number;
  deviceId: string;
  isDeleted: boolean;
  version: number;
}

export interface DebtReceivable {
  id: string;
  type: 'debt' | 'receivable';  // debt = money I owe; receivable = money owed to me
  personName: string;           // Contact name e.g. "Budi", "Bank Mandiri"
  originalAmount: number;       // Initial principal
  currentBalance: number;       // Remaining unpaid amount
  currency: CurrencyCode;
  dueDate?: string;             // YYYY-MM-DD
  status: 'open' | 'partially_paid' | 'settled';
  initialAccountId: string;     // Account used for original transaction
  note?: string;
  createdAt: number;
  updatedAt: number;
  deviceId: string;
  isDeleted: boolean;
  version: number;
}

export interface DebtPayment {
  id: string;
  debtReceivableId: string;
  transactionId: string;        // Transaction that adjusted cash/bank balance
  amount: number;
  date: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
  isDeleted: boolean;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface RecurringRule {
  id: string;
  title: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  accountId: string;
  categoryId: string;
  frequency: RecurringFrequency;
  intervalValue: number;        // e.g. every 1 month, every 2 weeks
  dayOfMonth?: number;          // 1 - 31 for monthly
  dayOfWeek?: number;           // 0 (Sun) - 6 (Sat) for weekly
  startDate: string;
  endDate?: string;
  nextExecutionDate: string;    // YYYY-MM-DD
  autoPost: boolean;            // true = auto post, false = reminder
  lastProcessedAt?: number;
  isDeleted: boolean;
  updatedAt: number;
  version: number;
}

export interface AuditLog {
  id: string;
  entityType: 'transaction' | 'account' | 'category' | 'debt' | 'recurring';
  entityId: string;
  action: 'create' | 'update' | 'soft_delete' | 'restore' | 'conflict_resolved' | 'conflict_superseded';
  deviceId: string;
  timestamp: number;
  beforeSnapshot?: Record<string, any>;
  afterSnapshot?: Record<string, any>;
  changeSummary: string;
}

export interface FXRate {
  id: string;                 // e.g. 'USD_IDR'
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  updatedAt: number;          // Timestamp ms
  source: 'frankfurter' | 'open_exchange' | 'manual';
}

export interface AppSettings {
  id: string;                 // 'current'
  baseCurrency: CurrencyCode; // Default 'IDR'
  dateFormat: string;         // 'YYYY-MM-DD' | 'DD/MM/YYYY'
  language: 'en' | 'id';
  theme: 'dark' | 'light' | 'system';
  deviceId: string;
  deviceName: string;
  
  // Security
  pinEnabled: boolean;
  pinHash?: string;           // SHA-256 hashed PIN
  biometricsEnabled: boolean;
  autoLockMinutes: number;    // 0 = immediately on blur/close
  lastUnlockedAt?: number;

  // Cloud & AI
  googleDriveLinked: boolean;
  googleDriveUserEmail?: string;
  googleDriveClientId?: string;
  lastSyncedAt?: number;
  dailyBackupEnabled: boolean;
  lastLocalBackupAt?: number;

  aiEnabled: boolean;
  aiProvider: 'gemini' | 'openai' | 'groq' | 'ollama_local';
  aiApiKey?: string;
  ollamaEndpoint?: string;    // Default 'http://localhost:11434'

  // Telegram Integration
  telegramEnabled?: boolean;
  telegramBotTokenEnc?: EncryptedPayload;
  telegramBotTokenMasked?: string;
  telegramBotUsername?: string;
  telegramChatId?: number;
  telegramBridgeMode?: 'worker' | 'daemon';
  telegramWorkerUrl?: string;
  telegramWorkerSecretEnc?: EncryptedPayload;
  telegramWorkerSecretMasked?: string;
  telegramLastActiveAt?: number;
}

// Phase 4 Sync & Backup Types
export interface SyncManifest {
  manifestVersion: number;
  deviceId: string;
  deviceName: string;
  lastSyncTimestamp: number;
  schemaVersion: number;
  activeRevisionId: string;
  totalRecordsCount: number;
  updatedAt: number;
}

export interface SyncPayloadData {
  deviceId: string;
  deviceName: string;
  timestamp: number;
  schemaVersion: number;
  tables: {
    accounts?: Account[];
    categories?: Category[];
    transactions?: Transaction[];
    debts_receivables?: DebtReceivable[];
    debt_payments?: DebtPayment[];
    recurring_rules?: RecurringRule[];
    ai_providers?: AIProviderConfig[];
    ai_keys?: AIKeyRecord[];
    ai_priorities?: AIPriorityItem[];
  };
}

export interface SyncConflictRecord {
  id: string;
  entityType: 'transaction' | 'account' | 'category' | 'debt' | 'recurring';
  entityId: string;
  localVersion: any;
  remoteVersion: any;
  winningSide: 'local' | 'remote';
  winningRecord: any;
  supersededVersion: any;
  resolvedAt: number;
  reason: string;
}

export interface LocalBackupMetadata {
  id: string;
  filename: string;
  timestamp: number;
  dateStr: string; // YYYY-MM-DD
  sizeBytes: number;
  recordCounts: {
    accounts: number;
    categories: number;
    transactions: number;
    debts: number;
    recurring: number;
    auditLogs: number;
  };
  source: 'auto_daily' | 'manual';
}

// Phase 5 AI Assistant, OCR & Proactive Advisor Types
export interface ActionProposal {
  id: string;
  type: 'create' | 'edit' | 'delete';
  status: 'pending' | 'confirmed' | 'cancelled';
  summary: string;
  data: {
    id?: string;
    type?: TransactionType;
    amount?: number;
    description?: string;
    accountId?: string;
    accountName?: string;
    categoryId?: string;
    categoryName?: string;
    date?: string;
    currency?: string;
    transferMeta?: TransferMeta;
    [key: string]: any;
  };
  beforeSnapshot?: any;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  proposals?: ActionProposal[];
  chartView?: 'net_worth' | 'cash_flow' | 'category_donut' | 'budget_performance';
  servingProvider?: string;
  servingModel?: string;
  failoverChain?: Array<{
    provider: string;
    model: string;
    reason: string;
  }>;
}

export interface OCRScanResult {
  merchantName?: string;
  recipientName?: string;
  sourceAccountName?: string;
  destinationAccountName?: string;
  transactionType?: 'expense' | 'income' | 'transfer';
  date?: string;
  totalAmount?: number;
  nominalAmount?: number;
  feeAmount?: number;
  taxAmount?: number;
  subtotalAmount?: number;
  currency?: string;
  notes?: string;
  referenceNumber?: string;
  categorySuggestion?: string;
  lineItems?: Array<{ description: string; amount: number }>;
  rawText: string;
  confidence: number;
  imageHash: string;
  isDuplicate?: boolean;
  engineUsed?: 'ai_vision' | 'tesseract_ocr';
}

export interface ProactiveAlertItem {
  id: string;
  type: 'spending_spike' | 'budget_warning' | 'budget_overrun' | 'bill_due' | 'debt_due';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: number;
  linkAction?: string;
  dismissed?: boolean;
}

// Phase 6 Telegram Ingestion Bridge Types
export interface TelegramInboxItem {
  id: string;
  updateId: number;
  messageId: number;
  chatId: number;
  fromName?: string;
  timestamp: number;
  type: 'text' | 'photo' | 'document';
  rawText?: string;
  photoUrl?: string;
  photoBase64?: string;
  fileId?: string;
  status: 'pending' | 'processed' | 'rejected';
  processedProposal?: ActionProposal;
  createdAt: number;
}

// Phase 8 AI Provider & API Key Management Types
export type AIProtocolType = 'openai_compatible' | 'gemini' | 'anthropic' | 'ollama';

export interface AIProviderConfig {
  id: string;                    // e.g. 'prov_openrouter', 'prov_custom_1'
  name: string;                  // e.g. 'OpenRouter', 'DeepSeek', 'Local LM Studio'
  type: 'preset' | 'custom';
  protocol: AIProtocolType;
  baseUrl: string;               // e.g. 'https://api.deepseek.com/v1'
  authHeaderFormat?: string;     // e.g. 'Bearer {KEY}', 'x-api-key: {KEY}'
  modelsEndpoint?: string;       // e.g. '/models', '/api/tags'
  availableModels: string[];     // Dynamically fetched model IDs
  selectedModel: string;         // Default chosen model ID
  isEnabled: boolean;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface EncryptedPayload {
  format: 'financeflow_enc_v1';
  salt: string;
  iv: string;
  ciphertext: string;
  timestamp: number;
}

export type AIKeyEncryptedPayload = EncryptedPayload;

export interface AIKeyRecord {
  id: string;                    // 'key_xxxx'
  providerId: string;            // Links to AIProviderConfig.id
  label: string;                 // e.g. 'Personal Tier', 'Work Plan'
  encryptedKeyPayload: AIKeyEncryptedPayload; // AES-GCM-256 encrypted at rest
  keyHint: string;               // e.g. 'sk-...4f8b'
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface AIPriorityItem {
  id: string;                    // 'prio_1'
  providerId: string;            // Links to AIProviderConfig.id
  keyId: string;                 // Links to AIKeyRecord.id
  modelOverride?: string;        // Specific model ID or defaults to provider.selectedModel
  order: number;                 // 1 = Top Priority, 2 = Next, etc.
  isEnabled: boolean;
}

export type AIHealthStatus = 'healthy' | 'degraded' | 'unreachable' | 'unknown';

export interface AIHealthRecord {
  id: string;                    // providerId or `${providerId}:${keyId}`
  status: AIHealthStatus;
  lastChecked: number;           // Epoch ms
  lastError?: string;
  consecutiveFailures: number;
}

export interface AIPersistentAlert {
  id: string;                    // alert_prov_xxx
  providerId: string;
  keyId?: string;
  providerName: string;
  keyLabel?: string;
  failureCount: number;
  reason: string;
  timestamp: number;
  dismissed: boolean;
}

