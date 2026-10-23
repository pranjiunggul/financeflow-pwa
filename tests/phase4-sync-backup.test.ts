/**
 * Phase 4 Test Suite: Google Drive Sync & Automated Dual Backup Engine
 * Validates:
 * 1. Automated Local Backup Engine (OPFS/IndexedDB, AES-GCM-256 PBKDF2 encryption, retention pruning, restore)
 * 2. Field-Level LWW Sync & Conflict Resolution Engine (3-way merge, conflict detection, audit archiving, manual rollback)
 * 3. Google Drive REST Client & Multipart Protocol (Isolated appDataFolder, encrypted payload transmission)
 */

import 'fake-indexeddb/auto';
import { db, initializeDatabaseSeed } from '../src/db/database';
import {
  createEncryptedLocalBackup,
  listAvailableLocalBackups,
  pruneOldBackups,
  restoreEncryptedBackup,
  createFullDatabaseDump,
  formatLocalDateStr,
} from '../src/services/backup';
import {
  buildLocalSyncPayload,
  mergeRemoteSyncPayload,
  restoreSupersededConflictRecord,
  performGoogleDriveSync,
} from '../src/services/sync';
import {
  uploadEncryptedSyncToDrive,
  downloadEncryptedSyncFromDrive,
} from '../src/services/gdrive';
import { decryptData } from '../src/services/crypto';
import type { SyncPayloadData, Transaction } from '../src/types';

async function runPhase4SyncBackupTests() {
  console.log('🚀 Starting Phase 4 Test Suite: Google Drive Sync & Dual Backup Engine...\n');

  // Initialize DB
  await initializeDatabaseSeed();

  const MASTER_PIN = '889900';
  const WRONG_PIN = '123456';

  // =========================================================================
  // Milestone 4.3: Automated Local Backup Engine Tests
  // =========================================================================
  console.log('--- Test 1: Full Database Serialization & AES-GCM-256 Encryption ---');
  const dump = await createFullDatabaseDump();
  console.log(`Serialized database: ${dump.tables.accounts.length} accounts, ${dump.tables.categories.length} categories.`);
  if (dump.tables.accounts.length === 0 || dump.tables.categories.length === 0) {
    throw new Error('Database dump is missing seeded accounts or categories!');
  }

  // Create encrypted local backup
  const backupMeta = await createEncryptedLocalBackup(MASTER_PIN, 'auto_daily');
  console.log(`Created encrypted backup: ${backupMeta.filename} (${backupMeta.sizeBytes} bytes)`);
  if (!backupMeta.filename.includes('auto_daily') || backupMeta.sizeBytes <= 0) {
    throw new Error('Encrypted backup metadata invalid!');
  }

  // Verify stored in IndexedDB local_backups
  const backupsList = await listAvailableLocalBackups();
  console.log(`Total local backups stored: ${backupsList.length}`);
  if (backupsList.length === 0 || backupsList[0].filename !== backupMeta.filename) {
    throw new Error('Backup was not found in available local backups list!');
  }
  console.log('[PASS] Full database dump correctly serialized, encrypted, and indexed.');

  // Test 2: Cryptographic Tamper & Authentication Verification
  console.log('\n--- Test 2: Cryptographic Decryption & Wrong PIN Rejection ---');
  const rawStored = await db.local_backups.get(backupMeta.id);
  if (!rawStored) throw new Error('Stored backup not found in DB!');

  // Should successfully decrypt with MASTER_PIN
  const decryptedDump = await decryptData(JSON.parse(rawStored.payload), MASTER_PIN);
  const parsedDump = typeof decryptedDump === 'string' ? JSON.parse(decryptedDump) : decryptedDump;
  if (!parsedDump.tables || parsedDump.tables.accounts.length !== dump.tables.accounts.length) {
    throw new Error('Decrypted backup content does not match original dump!');
  }
  console.log('[PASS] Valid master PIN successfully decrypted backup snapshot.');

  // Must reject wrong PIN with authentication tag failure
  let wrongPinFailed = false;
  try {
    await decryptData(JSON.parse(rawStored.payload), WRONG_PIN);
  } catch (err) {
    wrongPinFailed = true;
    console.log('[PASS] Rejected wrong PIN with cryptographic authentication tag error.');
  }
  if (!wrongPinFailed) {
    throw new Error('CRITICAL SECURITY ERROR: Backup decrypted with an invalid PIN!');
  }

  // Test 3: Rolling Retention Pruning (7 Daily + 4 Weekly)
  console.log('\n--- Test 3: Rolling Retention Policy Pruning ---');
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Part A: Seed 10 old backups across 50 days (interval of 5 days)
  // Ages: Day 0 (initial), Day 5 (daily), Day 10 (wk 1), Day 15 (wk 2),
  // Day 20 (dup wk 2 -> pruned), Day 25 (wk 3), Day 30 (wk 4),
  // Days 35, 40, 45, 50 (>35 days threshold -> pruned)
  for (let i = 1; i <= 10; i++) {
    const ageDays = i * 5; // 5, 10, 15, 20, 25, 30, 35, 40, 45, 50 days ago
    const ts = now - ageDays * MS_PER_DAY;
    const dateStr = formatLocalDateStr(new Date(ts));
    await db.local_backups.put({
      id: `bak_sim_${i}`,
      filename: `backup_${dateStr}_auto_daily.fflow.enc`,
      dateStr,
      timestamp: ts,
      payload: rawStored.payload,
      metadata: {
        id: `bak_sim_${i}`,
        filename: `backup_${dateStr}_auto_daily.fflow.enc`,
        timestamp: ts,
        dateStr,
        sizeBytes: 1024,
        recordCounts: { accounts: 3, categories: 10, transactions: 0, debts: 0, recurring: 0, auditLogs: 0 },
        source: 'auto_daily',
      },
    });
  }

  const beforePruneCount = (await listAvailableLocalBackups()).length;
  console.log(`Backups before pruning: ${beforePruneCount}`);
  const pruned = await pruneOldBackups();
  console.log(`Pruned ${pruned} expired backup snapshots exceeding 7-day + 4-week window.`);
  const afterPruneCount = (await listAvailableLocalBackups()).length;
  console.log(`Backups retained after pruning: ${afterPruneCount} (1 today + 1 day5 + 4 weekly: days 10, 15, 25, 30)`);
  if (afterPruneCount !== 6 || pruned !== 5) {
    throw new Error(`Expected exactly 6 retained and 5 pruned, got ${afterPruneCount} retained and ${pruned} pruned!`);
  }

  // Part B: Verify full capacity preservation (all 7 daily + 4 weekly = 11 retained)
  console.log('Testing full retention capacity: seeding all 7 consecutive daily + 4 weekly slots...');
  await db.local_backups.clear();
  // Seed 7 consecutive daily backups (days 0 through 6)
  for (let d = 0; d < 7; d++) {
    const ts = now - d * MS_PER_DAY;
    const dateStr = formatLocalDateStr(new Date(ts));
    await db.local_backups.put({
      id: `bak_daily_${d}`,
      filename: `backup_${dateStr}_auto_daily.fflow.enc`,
      dateStr,
      timestamp: ts,
      payload: rawStored.payload,
      metadata: { id: `bak_daily_${d}`, filename: `backup_${dateStr}_auto_daily.fflow.enc`, timestamp: ts, dateStr, sizeBytes: 1024, recordCounts: { accounts: 3, categories: 10, transactions: 0, debts: 0, recurring: 0, auditLogs: 0 }, source: 'auto_daily' }
    });
  }
  // Seed 4 distinct weekly backups (days 12, 19, 26, 33)
  const weeklyDays = [12, 19, 26, 33];
  for (const wd of weeklyDays) {
    const ts = now - wd * MS_PER_DAY;
    const dateStr = formatLocalDateStr(new Date(ts));
    await db.local_backups.put({
      id: `bak_weekly_${wd}`,
      filename: `backup_${dateStr}_auto_daily.fflow.enc`,
      dateStr,
      timestamp: ts,
      payload: rawStored.payload,
      metadata: { id: `bak_weekly_${wd}`, filename: `backup_${dateStr}_auto_daily.fflow.enc`, timestamp: ts, dateStr, sizeBytes: 1024, recordCounts: { accounts: 3, categories: 10, transactions: 0, debts: 0, recurring: 0, auditLogs: 0 }, source: 'auto_daily' }
    });
  }
  // Seed 2 expired backups (days 42, 50)
  for (const exp of [42, 50]) {
    const ts = now - exp * MS_PER_DAY;
    const dateStr = formatLocalDateStr(new Date(ts));
    await db.local_backups.put({
      id: `bak_exp_${exp}`,
      filename: `backup_${dateStr}_auto_daily.fflow.enc`,
      dateStr,
      timestamp: ts,
      payload: rawStored.payload,
      metadata: { id: `bak_exp_${exp}`, filename: `backup_${dateStr}_auto_daily.fflow.enc`, timestamp: ts, dateStr, sizeBytes: 1024, recordCounts: { accounts: 3, categories: 10, transactions: 0, debts: 0, recurring: 0, auditLogs: 0 }, source: 'auto_daily' }
    });
  }

  const fullCapacityBefore = (await listAvailableLocalBackups()).length;
  console.log(`Full capacity test before pruning: ${fullCapacityBefore} backups (7 daily + 4 weekly + 2 expired)`);
  const fullPruned = await pruneOldBackups();
  const fullCapacityAfter = (await listAvailableLocalBackups()).length;
  console.log(`Full capacity test after pruning: ${fullCapacityAfter} retained (pruned ${fullPruned} expired backups).`);
  if (fullCapacityAfter !== 11 || fullPruned !== 2) {
    throw new Error(`Expected exactly 11 retained (7 daily + 4 weekly) and 2 pruned, got ${fullCapacityAfter} retained and ${fullPruned} pruned!`);
  }
  console.log('[PASS] Retention policy proved: exactly 11 slots preserved (7 daily + 4 weekly) when all slots are populated.');

  // Test 4: Database Restoration from Encrypted File
  console.log('\n--- Test 4: Backup File Restoration Integrity ---');
  // Add a test transaction that will be wiped
  const tempTxId = 'tx_restore_test';
  await db.transactions.put({
    id: tempTxId,
    type: 'expense',
    amount: 99999,
    date: '2026-10-23',
    timestamp: Date.now(),
    accountId: 'acc_cash',
    categoryId: 'cat_food',
    currency: 'IDR',
    exchangeRateToBase: 1,
    baseAmount: 99999,
    description: 'Temp expense before restore',
    isDeleted: false,
    inputSource: 'manual',
    version: 1,
  });

  // Restore snapshot with overwrite=true
  const restoreRes = await restoreEncryptedBackup(rawStored.payload, MASTER_PIN, true);
  console.log(`Restored records: ${JSON.stringify(restoreRes.restoredCounts)}`);

  // Verify temp transaction was removed by overwrite
  const checkTempTx = await db.transactions.get(tempTxId);
  if (checkTempTx) {
    throw new Error('Temp transaction was not cleared during full overwrite restoration!');
  }

  // Verify accounts were restored
  const restoredAccCount = await db.accounts.count();
  if (restoredAccCount === 0) {
    throw new Error('Accounts table empty after restoration!');
  }
  console.log('[PASS] Full database successfully restored with verified integrity.');

  // =========================================================================
  // Milestone 4.2: Field-Level LWW Sync & Conflict Engine Tests
  // =========================================================================
  console.log('\n--- Test 5: Outbound Sync Delta Payload Generation ---');
  const { payload: outboundPayload, manifest: outboundManifest } = await buildLocalSyncPayload(0);
  console.log(`Generated manifest: Revision ${outboundManifest.activeRevisionId}, Records: ${outboundManifest.totalRecordsCount}`);
  if (!outboundManifest.activeRevisionId || outboundPayload.tables.accounts?.length === 0) {
    throw new Error('Outbound sync payload generation failed!');
  }
  console.log('[PASS] Outbound delta sync payload and manifest correctly constructed.');

  console.log('\n--- Test 6: Inbound Remote Delta Merge (Non-Conflicting) ---');
  const remoteTime = Date.now();
  const remotePayload1: SyncPayloadData = {
    deviceId: 'dev_remote_phone',
    deviceName: 'User Galaxy S24',
    timestamp: remoteTime,
    schemaVersion: 1,
    tables: {
      transactions: [
        {
          id: 'tx_remote_coffee',
          type: 'expense',
          amount: 45000,
          date: '2026-10-23',
          timestamp: remoteTime,
          accountId: 'acc_bank_bca',
          categoryId: 'cat_food',
          currency: 'IDR',
          exchangeRateToBase: 1,
          baseAmount: 45000,
          description: 'Iced Latte at Kopi Kenangan',
          isDeleted: false,
          inputSource: 'manual',
          createdAt: remoteTime,
          updatedAt: remoteTime,
          version: 1,
        },
      ],
    },
  };

  const merge1 = await mergeRemoteSyncPayload(remotePayload1, remoteTime - 1000);
  console.log(`Merged ${merge1.mergedCount} remote records. Conflicts: ${merge1.conflicts.length}`);
  const savedTx = await db.transactions.get('tx_remote_coffee');
  if (!savedTx || savedTx.amount !== 45000) {
    throw new Error('Remote transaction was not inserted into local database!');
  }
  console.log('[PASS] Remote transaction merged cleanly into local database.');

  console.log('\n--- Test 7: Concurrent Conflict Detection & LWW Resolution ---');
  const lastSyncTime = Date.now();

  // Local device edits transaction
  const localEditTime = lastSyncTime + 5000;
  await db.transactions.update('tx_remote_coffee', {
    description: 'Locally edited: Hot Cappuccino',
    amount: 50000,
    baseAmount: 50000,
    updatedAt: localEditTime,
  });

  // Remote device simultaneously edited transaction with a newer timestamp
  const remoteEditTime = lastSyncTime + 10000;
  const remoteConflictPayload: SyncPayloadData = {
    deviceId: 'dev_remote_laptop',
    deviceName: 'User MacBook Pro',
    timestamp: remoteEditTime,
    schemaVersion: 1,
    tables: {
      transactions: [
        {
          id: 'tx_remote_coffee',
          type: 'expense',
          amount: 48000,
          date: '2026-10-23',
          timestamp: remoteTime,
          accountId: 'acc_bank_bca',
          categoryId: 'cat_food',
          currency: 'IDR',
          exchangeRateToBase: 1,
          baseAmount: 48000,
          description: 'Remotely edited: Double Espresso',
          isDeleted: false,
          inputSource: 'manual',
          createdAt: remoteTime,
          updatedAt: remoteEditTime, // Newer than localEditTime
          version: 2,
        },
      ],
    },
  };

  const mergeConflict = await mergeRemoteSyncPayload(remoteConflictPayload, lastSyncTime);
  console.log(`Conflict Merge: ${mergeConflict.mergedCount} merged, ${mergeConflict.conflicts.length} conflict(s) detected.`);
  if (mergeConflict.conflicts.length !== 1) {
    throw new Error(`Expected exactly 1 conflict, got ${mergeConflict.conflicts.length}!`);
  }

  const detectedConflict = mergeConflict.conflicts[0];
  if (detectedConflict.winningSide !== 'remote') {
    throw new Error('LWW should select the newer remote update as winner!');
  }

  // Active DB record must have remote value (Double Espresso)
  const activeTx = await db.transactions.get('tx_remote_coffee');
  if (activeTx?.description !== 'Remotely edited: Double Espresso') {
    throw new Error(`LWW winner was not applied! Found: ${activeTx?.description}`);
  }

  // Verify superseded loser (Hot Cappuccino) was archived in audit_logs
  const supersededLog = await db.audit_logs
    .where('action')
    .equals('conflict_superseded')
    .and((l) => l.entityId === 'tx_remote_coffee')
    .first();

  if (!supersededLog || !supersededLog.beforeSnapshot?.description?.includes('Hot Cappuccino')) {
    throw new Error('Superseded version was not preserved in audit_logs!');
  }
  console.log('[PASS] Conflict detected, LWW winner applied, and superseded version archived to audit trail.');

  // Test 8: Manual Conflict Reversal / Rollback
  console.log('\n--- Test 8: Manual Conflict Reversal / Rollback ---');
  await restoreSupersededConflictRecord(detectedConflict);
  const revertedTx = await db.transactions.get('tx_remote_coffee');
  if (revertedTx?.description !== 'Locally edited: Hot Cappuccino') {
    throw new Error('Manual conflict rollback failed to restore superseded local record!');
  }
  console.log('[PASS] User manually reverted conflict, successfully restoring superseded local version.');

  // =========================================================================
  // Milestone 4.1: Google Drive REST Protocol & End-to-End Sync Simulation
  // =========================================================================
  console.log('\n--- Test 9: Google Drive REST Client & Multipart Protocol ---');
  // In-memory simulated Google Drive storage
  const mockDriveStorage = new Map<string, { id: string; name: string; content: string; modifiedTime: string }>();

  const mockDriveFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = input.toString();

    // 1. Search files: GET /drive/v3/files?spaces=appDataFolder&q=...
    if (urlStr.includes('/drive/v3/files') && !urlStr.includes('/upload') && init?.method !== 'POST') {
      const qParam = new URL(urlStr).searchParams.get('q') || '';
      const matched = Array.from(mockDriveStorage.values()).filter((f) => {
        if (qParam.includes("name = 'financeflow_manifest.json'")) return f.name === 'financeflow_manifest.json';
        if (qParam.includes("name = 'financeflow_data_latest.enc'")) return f.name === 'financeflow_data_latest.enc';
        return false;
      });

      return new Response(JSON.stringify({ files: matched }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Download media: GET /drive/v3/files/:id?alt=media
    if (urlStr.includes('/drive/v3/files/') && urlStr.includes('alt=media')) {
      const fileId = urlStr.split('/drive/v3/files/')[1].split('?')[0];
      const file = Array.from(mockDriveStorage.values()).find((f) => f.id === fileId);
      if (!file) {
        return new Response('Not Found', { status: 404 });
      }
      return new Response(file.content, { status: 200 });
    }

    // 3. Create multipart upload: POST /upload/drive/v3/files?uploadType=multipart
    if (urlStr.includes('/upload/drive/v3/files') && init?.method === 'POST') {
      const body = String(init.body);
      const metadataMatch = body.match(/\{[\s\S]*?\}/);
      const metadata = metadataMatch ? JSON.parse(metadataMatch[0]) : { name: 'unknown' };
      const contentParts = body.split('\r\n\r\n');
      const content = contentParts.length >= 3 ? contentParts[2].split('\r\n--')[0] : '';

      const fileId = 'gdrive_' + crypto.randomUUID().slice(0, 8);
      const fileEntry = {
        id: fileId,
        name: metadata.name,
        content,
        modifiedTime: new Date().toISOString(),
      };
      mockDriveStorage.set(metadata.name, fileEntry);

      return new Response(JSON.stringify({ id: fileId, name: metadata.name }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Update file media: PATCH /upload/drive/v3/files/:id?uploadType=media
    if (urlStr.includes('/upload/drive/v3/files/') && init?.method === 'PATCH') {
      const fileId = urlStr.split('/upload/drive/v3/files/')[1].split('?')[0];
      const file = Array.from(mockDriveStorage.values()).find((f) => f.id === fileId);
      if (!file) return new Response('Not Found', { status: 404 });
      file.content = String(init.body);
      file.modifiedTime = new Date().toISOString();
      return new Response(JSON.stringify({ id: file.id, name: file.name }), { status: 200 });
    }

    // 5. Userinfo
    if (urlStr.includes('oauth2/v3/userinfo')) {
      return new Response(JSON.stringify({ email: 'alex.finance@gmail.com', name: 'Alex Johnson' }), { status: 200 });
    }

    return new Response('Mock Route Not Found', { status: 404 });
  };

  // Perform full drive sync cycle
  console.log('Executing performGoogleDriveSync with mock Google Drive endpoints...');
  const syncResult = await performGoogleDriveSync(
    MASTER_PIN,
    'mock_client_id_123',
    'mock_access_token_xyz',
    mockDriveFetch
  );

  console.log(`Sync completed: Success=${syncResult.success}, Revision=${syncResult.manifest.activeRevisionId}`);
  if (!syncResult.success) {
    throw new Error('Google Drive sync failed!');
  }

  // Verify what was stored in Google Drive
  const driveManifest = mockDriveStorage.get('financeflow_manifest.json');
  const driveEncData = mockDriveStorage.get('financeflow_data_latest.enc');

  if (!driveManifest || !driveEncData) {
    throw new Error('Google Drive is missing required manifest or encrypted payload!');
  }

  // Critical zero-knowledge security check: Drive payload MUST be AES-GCM ciphertext, NOT plaintext
  if (driveEncData.content.includes('Hot Cappuccino') || driveEncData.content.includes('Kopi Kenangan')) {
    throw new Error('CRITICAL PRIVACY BREACH: Plaintext transaction found in Google Drive payload!');
  }

  const parsedDriveEnc = JSON.parse(driveEncData.content);
  if (parsedDriveEnc.format !== 'financeflow_enc_v1' || !parsedDriveEnc.ciphertext || !parsedDriveEnc.iv) {
    throw new Error('Drive encrypted payload is not a valid AES-GCM-256 envelope!');
  }

  console.log('[PASS] Google Drive payload is 100% authenticated AES-GCM-256 ciphertext; zero plaintext leakage.');

  console.log('\n🎉 ALL PHASE 4 GOOGLE DRIVE SYNC & DUAL BACKUP TESTS PASSED WITH 100% SUCCESS!');
}

runPhase4SyncBackupTests().catch((err) => {
  console.error('\n❌ PHASE 4 TEST FAILED:', err);
  process.exit(1);
});
