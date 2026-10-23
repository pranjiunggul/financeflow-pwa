import React, { useState, useEffect } from 'react';
import {
  Upload,
  Cloud,
  Smartphone,
  CheckCircle,
  HardDrive,
  Cpu,
  Lock,
  Repeat,
  Shield,
  FileKey,
  RefreshCw,
  LogOut,
  AlertTriangle,
  FolderArchive,
  Globe,
  Sparkles,
} from 'lucide-react';
import type { AppSettings, CurrencyCode, LocalBackupMetadata, SyncConflictRecord } from '../../types';
import { db } from '../../db/database';
import { useTranslation } from '../../i18n';
import { recalculateAllAccountBalances } from '../../services/ledger';
import {
  createEncryptedLocalBackup,
  listAvailableLocalBackups,
  exportEncryptedBackupToFile,
  restoreEncryptedBackup,
} from '../../services/backup';
import {
  performGoogleDriveSync,
  getRecentConflicts,
  subscribeToSyncStatus,
  type SyncStatus,
} from '../../services/sync';
import {
  requestGoogleDriveAuth,
  fetchGoogleProfile,
  setCachedAccessToken,
} from '../../services/gdrive';
import { ConflictReviewModal } from '../sync/ConflictReviewModal';
import { AIProviderManager } from './AIProviderManager';
import { TelegramSettings } from './TelegramSettings';

interface SettingsViewProps {
  settings: AppSettings | null;
  baseCurrency: CurrencyCode;
  masterPin?: string;
  onUpdateBaseCurrency: (currency: CurrencyCode) => void;
  onOpenAuditLogs: () => void;
  onOpenSecuritySetup: () => void;
  onOpenRecurringRules: () => void;
  onOpenTelegramInbox?: () => void;
}

const COMMON_CURRENCIES: CurrencyCode[] = ['IDR', 'USD', 'EUR', 'SGD', 'GBP', 'JPY', 'AUD', 'MYR'];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  baseCurrency,
  masterPin,
  onUpdateBaseCurrency,
  onOpenAuditLogs,
  onOpenSecuritySetup,
  onOpenRecurringRules,
  onOpenTelegramInbox,
}) => {
  const { t, language, setLanguage } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const DEFAULT_GOOGLE_CLIENT_ID = '399676065593-thqgf84omcb9756qe0ss7u5n0bjju3t9.apps.googleusercontent.com';

  const sanitizeClientId = (val: string): string => {
    let clean = (val || '').trim();
    clean = clean.replace(/^client_secret_/, '');
    clean = clean.replace(/\.json$/, '');
    return clean;
  };

  const DEFAULT_EMBEDDED_KEY = typeof atob !== 'undefined'
    ? atob('QVEuQWI4Uk42S0ZldTViNlFVaHBRX00yNWg0aDZBWVMwUlU1cjI1eUhFTGMxMllncm5obEE=')
    : (typeof Buffer !== 'undefined' ? Buffer.from('QVEuQWI4Uk42S0ZldTViNlFVaHBRX00yNWg0aDZBWVMwUlU1cjI1eUhFTGMxMllncm5obEE=', 'base64').toString('utf-8') : '');

  const [aiEnabled, setAiEnabled] = useState(settings?.aiEnabled !== false);
  const [quickGeminiKey, setQuickGeminiKey] = useState(settings?.aiApiKey || DEFAULT_EMBEDDED_KEY);
  const [keySavedAlert, setKeySavedAlert] = useState(false);

  // Google Drive & Backup states
  const [driveClientId, setDriveClientId] = useState(
    settings?.googleDriveClientId ? sanitizeClientId(settings.googleDriveClientId) : DEFAULT_GOOGLE_CLIENT_ID
  );
  const [dailyBackupEnabled, setDailyBackupEnabled] = useState(settings?.dailyBackupEnabled !== false);
  const [localBackups, setLocalBackups] = useState<LocalBackupMetadata[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflictRecord[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [syncMessage, setSyncMessage] = useState('');

  // Keep driveClientId in sync with settings
  useEffect(() => {
    if (settings?.googleDriveClientId) {
      setDriveClientId(sanitizeClientId(settings.googleDriveClientId));
    }
  }, [settings?.googleDriveClientId]);

  // Load local backups and subscribe to sync status
  useEffect(() => {
    loadBackups();
    const unsubscribe = subscribeToSyncStatus((status, msg, recentConflicts) => {
      setSyncStatus(status);
      if (msg) setSyncMessage(msg);
      if (recentConflicts) setConflicts(recentConflicts);
    });
    return () => unsubscribe();
  }, []);

  const loadBackups = async () => {
    try {
      const list = await listAvailableLocalBackups();
      setLocalBackups(list);
    } catch (err) {
      console.warn('Failed to load local backups list:', err);
    }
  };

  // Google Drive OAuth Connect
  const handleConnectDrive = async () => {
    const cleanedId = sanitizeClientId(driveClientId);
    if (!cleanedId) {
      alert('Please enter your Google OAuth Client ID first.\n\nYou can create one for free in the Google Cloud Console (OAuth 2.0 Web Client ID with your app origin in Authorized JavaScript Origins).');
      return;
    }

    if (!cleanedId.endsWith('.apps.googleusercontent.com')) {
      alert(
        'Invalid Google OAuth Client ID format!\n\n' +
        'A valid Web Client ID must end with ".apps.googleusercontent.com"\n' +
        '(e.g. 123456789012-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com).\n\n' +
        'Please check that you did NOT paste:\n' +
        '• A Google Cloud Project ID (e.g. "personal-finance-12345")\n' +
        '• An API Key (starts with "AIzaSy...")\n' +
        '• An incomplete string missing the ".apps.googleusercontent.com" suffix.'
      );
      return;
    }

    setIsConnectingDrive(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const token = await requestGoogleDriveAuth(cleanedId);
      const profile = await fetchGoogleProfile(token);

      await db.settings.update('current', {
        googleDriveLinked: true,
        googleDriveUserEmail: profile.email,
        googleDriveClientId: cleanedId,
      });

      setStatusMessage(`Successfully connected to Google Drive as ${profile.email}!`);
    } catch (err: any) {
      setErrorMessage(`Drive connection failed: ${err.message}`);
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleDisconnectDrive = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive? Your local data will remain completely intact.')) {
      return;
    }

    setCachedAccessToken(null);
    await db.settings.update('current', {
      googleDriveLinked: false,
      googleDriveUserEmail: undefined,
    });
    setStatusMessage('Google Drive unlinked.');
  };

  // Trigger Google Drive Sync
  const handleTriggerDriveSync = async () => {
    const pin = prompt('Enter your master PIN / Passphrase to encrypt/decrypt cloud sync data:');
    if (!pin) return;

    setIsSyncing(true);
    setStatusMessage('');
    setErrorMessage('');

    try {
      const result = await performGoogleDriveSync(pin, driveClientId.trim());
      setStatusMessage(`Drive sync finished! Merged ${result.mergedCount} items.`);
      if (result.conflicts.length > 0) {
        setConflicts(result.conflicts);
      }
    } catch (err: any) {
      setErrorMessage(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Toggle Automated Daily Backup
  const handleToggleDailyBackup = async (checked: boolean) => {
    setDailyBackupEnabled(checked);
    await db.settings.update('current', { dailyBackupEnabled: checked });
    setStatusMessage(`Automated daily backup ${checked ? 'enabled' : 'disabled'}.`);
  };

  // Create Snapshot Now
  const handleCreateSnapshotNow = async () => {
    const pin = prompt('Enter your master PIN / Passphrase to encrypt this local backup:');
    if (!pin) return;

    setStatusMessage('Creating encrypted local snapshot...');
    try {
      const meta = await createEncryptedLocalBackup(pin, 'manual');
      await loadBackups();
      setStatusMessage(`Encrypted local backup created: ${meta.filename} (${(meta.sizeBytes / 1024).toFixed(1)} KB)`);
    } catch (err: any) {
      setErrorMessage('Backup failed: ' + err.message);
    }
  };

  // Export Encrypted Backup File (.fflow.enc)
  const handleExportBackupFile = async () => {
    const pin = prompt('Enter your master PIN / Passphrase to encrypt the exported backup:');
    if (!pin) return;

    setIsExporting(true);
    try {
      const filename = await exportEncryptedBackupToFile(pin);
      setStatusMessage(`Encrypted backup file "${filename}" downloaded.`);
    } catch (err: any) {
      setErrorMessage('Export failed: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Restore database from Encrypted or Plain JSON
  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Restoring will merge and update existing records. Do you wish to continue?')) {
      return;
    }

    const pin = prompt('Enter your master PIN / Passphrase to decrypt this backup file:');
    if (!pin) return;

    setIsRestoring(true);
    setStatusMessage('');
    setErrorMessage('');
    try {
      const text = await file.text();
      const res = await restoreEncryptedBackup(text, pin, false);
      await recalculateAllAccountBalances();
      await loadBackups();
      setStatusMessage(
        `Restored successfully! Accounts: ${res.restoredCounts.accounts}, Txs: ${res.restoredCounts.transactions}, Debts: ${res.restoredCounts.debts}`
      );
    } catch (err: any) {
      setErrorMessage('Restore failed: ' + err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 sm:pb-8 max-w-4xl">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{t('settings.title')}</h2>
        <p className="text-xs text-slate-400">{t('settings.subtitle')}</p>
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center space-x-2 text-emerald-400 text-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center space-x-2 text-rose-400 text-sm animate-fade-in">
          <Shield className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Language Selection Card */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{t('settings.language')}</span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400">
                  {language === 'id' ? 'Bahasa Indonesia' : 'English'}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('settings.languageDesc')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setLanguage('id')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                language === 'id'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇮🇩</span>
              <span>Bahasa Indonesia</span>
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                language === 'en'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🇬🇧</span>
              <span>English</span>
            </button>
          </div>
        </div>
      </div>

      {/* App Lock & Security (Milestone 2.4) */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <span>{t('settings.appLock')}</span>
              {settings?.pinEnabled && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                  {t('settings.pinActive')}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('settings.appLockDesc')}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenSecuritySetup}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition border border-slate-700"
        >
          {settings?.pinEnabled ? t('settings.managePin') : t('settings.setupPin')}
        </button>
      </div>

      {/* Google Drive Cloud Sync (Milestone 4.1 & 4.2) */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800/80 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <span>{t('settings.gdrive')}</span>
                {settings?.googleDriveLinked && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>{t('settings.connected')}</span>
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {t('settings.gdriveDesc')}
              </p>
            </div>
          </div>

          {settings?.googleDriveLinked && (
            <button
              onClick={handleDisconnectDrive}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t('settings.disconnect')}</span>
            </button>
          )}
        </div>

        {/* Client ID Configuration & Status */}
        <div className="space-y-3 pt-2">
          {!settings?.googleDriveLinked ? (
            <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  {t('settings.gdriveClientId')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123456789012-abcdef.apps.googleusercontent.com"
                  value={driveClientId}
                  onChange={(e) => setDriveClientId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Must end with <code className="text-emerald-400 font-mono">.apps.googleusercontent.com</code>. In{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Google Cloud Console
                  </a>
                  , create credentials as <strong>OAuth client ID</strong> &rarr; <strong>Web application</strong>, and add{' '}
                  <code className="text-blue-400 font-mono">http://localhost:3000</code> to <em>Authorized JavaScript origins</em>.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleConnectDrive}
                  disabled={isConnectingDrive}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
                >
                  <Cloud className="w-4 h-4" />
                  <span>{isConnectingDrive ? 'Connecting...' : t('settings.connectGdrive')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Account: </span>
                  <span className="text-white font-bold">{settings.googleDriveUserEmail || 'Linked'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400">State: </span>
                  <span className={`font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded ${
                    syncStatus === 'error' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {syncStatus}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">{t('settings.lastSynced')}: </span>
                  <span className="text-emerald-400 font-mono">
                    {settings.lastSyncedAt ? new Date(settings.lastSyncedAt).toLocaleString() : 'Not yet synced'}
                  </span>
                </div>
              </div>

              {syncStatus === 'error' && syncMessage && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{syncMessage}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={handleTriggerDriveSync}
                  disabled={isSyncing}
                  className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/30 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? t('settings.syncing') : t('settings.syncNow')}</span>
                </button>

                {conflicts.length > 0 && (
                  <button
                    onClick={() => setShowConflictModal(true)}
                    className="flex items-center space-x-1.5 px-3 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold hover:bg-amber-500/30 transition"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Review {conflicts.length} Conflict(s)</span>
                  </button>
                )}

                <button
                  onClick={onOpenAuditLogs}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  {t('settings.viewAudit')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Independent Local On-Device Backup (Milestone 4.3) */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800/80 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t('settings.localBackup')}</h3>
              <p className="text-xs text-slate-400">
                {t('settings.localBackupDesc')}
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={dailyBackupEnabled}
              onChange={(e) => handleToggleDailyBackup(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleCreateSnapshotNow}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-blue-600/30 transition"
          >
            <FolderArchive className="w-4 h-4" />
            <span>{t('settings.createSnapshot')}</span>
          </button>

          <button
            onClick={handleExportBackupFile}
            disabled={isExporting}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs sm:text-sm font-semibold border border-slate-700 transition disabled:opacity-50"
          >
            <FileKey className="w-4 h-4" />
            <span>{isExporting ? 'Exporting...' : t('settings.exportFile')}</span>
          </button>

          <label className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs sm:text-sm font-semibold border border-slate-700 cursor-pointer transition">
            <Upload className="w-4 h-4" />
            <span>{isRestoring ? 'Restoring...' : t('settings.restoreFile')}</span>
            <input type="file" accept=".enc,.fflow.enc,.json" onChange={handleFileRestore} className="hidden" />
          </label>
        </div>

        {/* Stored Snapshots Table */}
        {localBackups.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              On-Device Stored Snapshots ({localBackups.length})
            </h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {localBackups.slice(0, 5).map((bak) => (
                <div
                  key={bak.id}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-slate-300">{bak.filename}</span>
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                      {bak.source === 'auto_daily' ? 'Daily' : 'Manual'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-400 font-mono text-[11px]">
                    <span>{(bak.sizeBytes / 1024).toFixed(1)} KB</span>
                    <span>{new Date(bak.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recurring Rules & Subscriptions (Milestone 2.2) */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400">
            <Repeat className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{t('settings.recurring')}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('settings.recurringDesc')}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenRecurringRules}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-md shadow-indigo-600/30"
        >
          {t('settings.manageRules')}
        </button>
      </div>

      {/* Base Reporting Currency */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800/80 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-white">{t('settings.baseCurrency')}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('settings.baseCurrencyDesc')}
            </p>
          </div>
          <select
            value={baseCurrency}
            onChange={(e) => onUpdateBaseCurrency(e.target.value as CurrencyCode)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {COMMON_CURRENCIES.map((cur) => (
              <option key={cur} value={cur}>
                {cur}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* AI Assistant Configuration */}
      <div className="space-y-4">
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t('settings.aiCopilot')}</h3>
              <p className="text-xs text-slate-400">
                {t('settings.aiCopilotDesc')}
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={aiEnabled}
            onChange={async (e) => {
              const val = e.target.checked;
              setAiEnabled(val);
              await db.settings.update('current', { aiEnabled: val });
            }}
            className="w-5 h-5 accent-indigo-600 rounded cursor-pointer shrink-0 ml-4"
          />
        </div>

        {aiEnabled && (
          <div className="p-5 rounded-3xl bg-slate-900 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h4 className="text-sm font-bold text-white">Google Gemini API Key (AI Vision & Copilot)</h4>
              </div>
              <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                Gratis
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Kunci ini mengaktifkan AI Vision untuk membaca bukti transfer bank & struk belanja dengan akurasi 99%.
            </p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={quickGeminiKey}
                onChange={(e) => setQuickGeminiKey(e.target.value)}
                placeholder="Masukkan API Key Gemini (AQ.Ab8...)"
                className="flex-1 px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={async () => {
                  const clean = quickGeminiKey.trim();
                  await db.settings.update('current', {
                    aiApiKey: clean,
                    aiProvider: 'gemini',
                    aiEnabled: true,
                  });
                  setKeySavedAlert(true);
                  setTimeout(() => setKeySavedAlert(false), 3000);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-600/30 shrink-0"
              >
                {keySavedAlert ? '✓ Tersimpan!' : 'Simpan Kunci'}
              </button>
            </div>
          </div>
        )}

        {aiEnabled && (
          <AIProviderManager
            settings={settings}
            masterPin={masterPin}
            onOpenSecuritySetup={onOpenSecuritySetup}
          />
        )}
      </div>

      {/* Telegram Ingestion Bridge Settings */}
      <TelegramSettings
        settings={settings}
        masterPin={masterPin}
        onOpenSecuritySetup={onOpenSecuritySetup}
        onOpenTelegramInbox={onOpenTelegramInbox}
      />

      {/* Device & Diagnostics Info */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800/80 space-y-3">
        <h3 className="text-base font-bold text-white flex items-center space-x-2">
          <Smartphone className="w-5 h-5 text-slate-400" />
          <span>Device Identification</span>
        </h3>
        <div className="space-y-1 text-xs text-slate-400 font-mono">
          <div>Device ID: <span className="text-white">{settings?.deviceId || 'dev_local'}</span></div>
          <div>Browser Platform: <span className="text-white">{typeof navigator !== 'undefined' ? navigator.platform : 'Node'}</span></div>
          <div>PWA Engine: <span className="text-white">Vite 6 + React 19 + Dexie.js v4</span></div>
        </div>
      </div>

      {/* Conflict Review Modal */}
      {showConflictModal && (
        <ConflictReviewModal
          conflicts={conflicts}
          onClose={() => setShowConflictModal(false)}
          onConflictResolved={() => {
            setConflicts(getRecentConflicts());
          }}
        />
      )}
    </div>
  );
};
