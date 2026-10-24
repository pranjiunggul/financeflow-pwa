/**
 * Automated Test Suite: Single-User Multi-Device Sync Enhancements
 * Tests:
 * 1. Device Identity, User-Agent Inference & Manifest Device Aggregation
 * 2. Cross-Device Duplicate Transaction Detection (70% Similarity Threshold) & 1-Tap Resolution
 * 3. Single Approved Google Account Lock, Accidental Mismatch Blocking, and PIN-Gated Migration Pathway
 */

import 'fake-indexeddb/auto';
import { db, initializeDatabaseSeed, getOrCreateDeviceId } from '../src/db/database';
import {
  detectDeviceInfo,
  getLocalDeviceInfo,
  updateLocalDeviceName,
  aggregateDevicesList,
} from '../src/services/device';
import {
  calculateDescriptionSimilarity,
  detectCrossDeviceDuplicates,
  resolveDuplicatePair,
  getPendingDuplicatePairs,
  SIMILARITY_THRESHOLD,
} from '../src/services/syncDuplicates';
import {
  performGoogleDriveSync,
  changeApprovedGoogleAccount,
} from '../src/services/sync';
import type { Transaction, ConnectedDeviceInfo } from '../src/types';

async function runSyncEnhancementsTests() {
  console.log('🚀 Starting Single-User Multi-Device Sync Enhancements Test Suite...\n');

  // Initialize DB seed
  await initializeDatabaseSeed();
  const MASTER_PIN = '889900';

  // =========================================================================
  // Test 1: Device Identity, User-Agent Inference & Manifest Aggregation
  // =========================================================================
  console.log('--- Test 1: Device Identity & User-Agent Inference ---');

  // 1A: Test Desktop UA
  const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  const desktopInfo = detectDeviceInfo(desktopUA);
  console.log(`Desktop detection: ${desktopInfo.deviceType} | ${desktopInfo.defaultName}`);
  if (desktopInfo.deviceType !== 'desktop' || desktopInfo.osName !== 'Windows' || desktopInfo.browserName !== 'Chrome') {
    throw new Error('Desktop UA inference failed');
  }

  // 1B: Test Mobile UA
  const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
  const mobileInfo = detectDeviceInfo(mobileUA);
  console.log(`Mobile detection: ${mobileInfo.deviceType} | ${mobileInfo.defaultName}`);
  if (mobileInfo.deviceType !== 'mobile' || mobileInfo.osName !== 'iPhone (iOS)' || mobileInfo.browserName !== 'Safari') {
    throw new Error('Mobile UA inference failed');
  }

  // 1C: Test Tablet UA
  const tabletUA = 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1';
  const tabletInfo = detectDeviceInfo(tabletUA);
  console.log(`Tablet detection: ${tabletInfo.deviceType} | ${tabletInfo.defaultName}`);
  if (tabletInfo.deviceType !== 'tablet') {
    throw new Error('Tablet UA inference failed');
  }

  // 1D: Local device retrieval & renaming
  const initialLocal = await getLocalDeviceInfo();
  console.log(`Local device ID: ${initialLocal.deviceId}, Name: "${initialLocal.deviceName}"`);
  if (!initialLocal.deviceId.startsWith('dev_')) {
    throw new Error('Local device ID does not have expected dev_ prefix');
  }

  const renamedLocal = await updateLocalDeviceName('My Personal ThinkPad');
  if (renamedLocal.deviceName !== 'My Personal ThinkPad') {
    throw new Error('Device renaming failed');
  }
  console.log('[PASS] Local device successfully renamed to "My Personal ThinkPad".');

  // 1E: Device aggregation across sync manifests
  const remoteDevices: ConnectedDeviceInfo[] = [
    {
      deviceId: 'dev_phone_iphone15',
      deviceName: 'iPhone 15 Pro',
      deviceType: 'mobile',
      browserName: 'Safari',
      osName: 'iOS',
      firstSeenAt: Date.now() - 3600000,
      lastSyncAt: Date.now() - 600000,
    },
    {
      deviceId: initialLocal.deviceId,
      deviceName: 'Old Desktop Name',
      deviceType: 'desktop',
      firstSeenAt: Date.now() - 7200000,
      lastSyncAt: Date.now() - 1000000,
    },
  ];

  const aggregated = aggregateDevicesList(remoteDevices, renamedLocal);
  if (aggregated.length !== 2) {
    throw new Error(`Expected 2 aggregated devices, got ${aggregated.length}`);
  }
  if (!aggregated[0].isCurrentDevice || aggregated[0].deviceName !== 'My Personal ThinkPad') {
    throw new Error('Current device was not sorted first or did not retain updated custom name');
  }
  console.log('[PASS] Manifest device aggregation correctly merged remote and local devices.');

  // =========================================================================
  // Test 2: Cross-Device Duplicate Transaction Detection (70% Threshold) & 1-Tap Resolution
  // =========================================================================
  console.log('\n--- Test 2: Cross-Device Duplicate Transaction Detection & Resolution ---');

  // 2A: Verify similarity threshold constant
  console.log(`Similarity threshold: ${SIMILARITY_THRESHOLD * 100}%`);
  if (SIMILARITY_THRESHOLD !== 0.70) {
    throw new Error(`Expected threshold 0.70, got ${SIMILARITY_THRESHOLD}`);
  }

  // 2B: Similarity calculation tests
  const sim1 = calculateDescriptionSimilarity('Kopi Kenangan Senayan', 'Kopi Kenangan Senayan');
  const sim2 = calculateDescriptionSimilarity('Kopi Kenangan Senayan', 'Kopi Kenangan');
  const sim3 = calculateDescriptionSimilarity('Pembayaran QRIS Kopi Kenangan Senayan', 'Kopi Kenangan Senayan');
  const sim4 = calculateDescriptionSimilarity('Beli Tiket Pesawat Garuda', 'Bayar Tagihan Listrik PLN');

  console.log(`Similarity Exact: ${sim1}`);
  console.log(`Similarity Substring ("Kopi Kenangan Senayan" vs "Kopi Kenangan"): ${sim2}`);
  console.log(`Similarity Token Overlap ("Pembayaran QRIS..." vs "..."): ${sim3}`);
  console.log(`Similarity Unrelated: ${sim4}`);

  if (sim1 !== 1.0) throw new Error('Exact match similarity must be 1.0');
  if (sim2 < 0.70) throw new Error('Substring merchant match should be >= 0.70');
  if (sim3 < 0.70) throw new Error('Token overlap merchant match should be >= 0.70');
  if (sim4 >= 0.70) throw new Error('Unrelated descriptions should be < 0.70');

  // 2C: Cross-device detection during merge
  const accounts = await db.accounts.toArray();
  const bcaAccount = accounts[0];

  const localTx: Transaction = {
    id: 'tx_laptop_coffee_01',
    type: 'expense',
    date: '2026-10-24',
    timestamp: Date.now() - 100000,
    amount: 35000,
    currency: 'IDR',
    exchangeRateToBase: 1,
    baseAmount: 35000,
    accountId: bcaAccount.id,
    categoryId: 'cat_food',
    description: 'Kopi Kenangan Senayan',
    inputSource: 'manual',
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 100000,
    deviceId: initialLocal.deviceId,
    isDeleted: false,
    version: 1,
  };
  await db.transactions.put(localTx);

  const remoteTx: Transaction = {
    id: 'tx_phone_coffee_99',
    type: 'expense',
    date: '2026-10-24',
    timestamp: Date.now() - 90000,
    amount: 35000,
    currency: 'IDR',
    exchangeRateToBase: 1,
    baseAmount: 35000,
    accountId: bcaAccount.id,
    categoryId: 'cat_food',
    description: 'Pembayaran QRIS Kopi Kenangan Senayan',
    inputSource: 'ocr',
    createdAt: Date.now() - 90000,
    updatedAt: Date.now() - 90000,
    deviceId: 'dev_phone_iphone15',
    isDeleted: false,
    version: 1,
  };

  // Both transactions admitted into database (no silent drops)
  await db.transactions.put(remoteTx);

  const detectedPairs = await detectCrossDeviceDuplicates(
    [remoteTx],
    [localTx],
    initialLocal.deviceId
  );

  console.log(`Detected cross-device duplicate pairs: ${detectedPairs.length}`);
  if (detectedPairs.length !== 1) {
    throw new Error('Expected 1 cross-device duplicate pair to be detected!');
  }

  const pair = detectedPairs[0];
  console.log(`Duplicate Pair Reason: "${pair.reason}" (Score: ${pair.similarityScore})`);
  if (pair.similarityScore < 0.70) {
    throw new Error('Detected pair similarity score must be >= 0.70');
  }

  // Verify pair stored in db.sync_duplicates
  const pendingPairs = await getPendingDuplicatePairs();
  if (pendingPairs.length !== 1 || pendingPairs[0].id !== pair.id) {
    throw new Error('Duplicate pair not found in db.sync_duplicates!');
  }
  console.log('[PASS] Cross-device duplicate pair successfully detected and queued for review.');

  // 2D: 1-Tap Resolution: Keep Local (Soft-delete remote)
  await resolveDuplicatePair(pair.id, 'keep_local');
  const postResolveRemote = await db.transactions.get(remoteTx.id);
  const postResolveLocal = await db.transactions.get(localTx.id);

  if (!postResolveRemote?.isDeleted) {
    throw new Error('Remote transaction should have been soft-deleted by keep_local resolution!');
  }
  if (postResolveLocal?.isDeleted) {
    throw new Error('Local transaction should remain active after keep_local resolution!');
  }
  console.log('[PASS] 1-Tap resolution "keep_local" soft-deleted remote duplicate while preserving local record.');

  // 2E: Test "keep_both" on a second distinct pair
  const localTx2: Transaction = {
    ...localTx,
    id: 'tx_laptop_02',
    description: 'Warung Mie Ayam Bakso',
    amount: 25000,
  };
  const remoteTx2: Transaction = {
    ...remoteTx,
    id: 'tx_phone_03',
    description: 'Mie Ayam Bakso Wonogiri',
    amount: 25000,
  };
  await db.transactions.bulkPut([localTx2, remoteTx2]);
  const detected2 = await detectCrossDeviceDuplicates([remoteTx2], [localTx2], initialLocal.deviceId);
  if (detected2.length !== 1) throw new Error('Expected second duplicate pair to be detected');

  await resolveDuplicatePair(detected2[0].id, 'keep_both');
  const checkL2 = await db.transactions.get(localTx2.id);
  const checkR2 = await db.transactions.get(remoteTx2.id);
  if (checkL2?.isDeleted || checkR2?.isDeleted) {
    throw new Error('keep_both must NOT soft-delete either transaction!');
  }
  console.log('[PASS] 1-Tap resolution "keep_both" successfully retained both transactions as distinct entries.');

  // =========================================================================
  // Test 3: Single Approved Google Account Lock, Accidental Mismatch & Migration
  // =========================================================================
  console.log('\n--- Test 3: Single Approved Google Account Lock & Migration ---');

  // Simulated in-memory Google Drive REST backend
  const mockDriveStorage = new Map<string, { id: string; name: string; content: string }>();
  let currentAuthUser = {
    id: 'goog_user_112233',
    email: 'alex.finance@gmail.com',
    name: 'Alex Johnson',
  };

  const mockDriveFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = input.toString();

    // 1. Userinfo endpoint
    if (urlStr.includes('oauth2/v3/userinfo')) {
      return new Response(JSON.stringify(currentAuthUser), { status: 200 });
    }

    // 2. Drive About endpoint
    if (urlStr.includes('/drive/v3/about')) {
      return new Response(
        JSON.stringify({
          user: {
            emailAddress: currentAuthUser.email,
            displayName: currentAuthUser.name,
            permissionId: currentAuthUser.id,
          },
        }),
        { status: 200 }
      );
    }

    // 3. Download file media: GET /drive/v3/files/:id?alt=media
    if (urlStr.includes('/drive/v3/files/') && urlStr.includes('alt=media')) {
      const fileId = urlStr.split('/drive/v3/files/')[1].split('?')[0];
      const file = Array.from(mockDriveStorage.values()).find((f) => f.id === fileId);
      if (!file) return new Response('Not Found', { status: 404 });
      return new Response(file.content, { status: 200 });
    }

    // 4. Search files in appDataFolder: GET /drive/v3/files?spaces=appDataFolder...
    if (urlStr.includes('/drive/v3/files') && !urlStr.includes('/upload') && init?.method !== 'POST') {
      const qParam = new URL(urlStr).searchParams.get('q') || '';
      const matched = Array.from(mockDriveStorage.values()).filter((f) => {
        if (qParam.includes("name = 'financeflow_manifest.json'")) return f.name === 'financeflow_manifest.json';
        if (qParam.includes("name = 'financeflow_data_latest.enc'")) return f.name === 'financeflow_data_latest.enc';
        return false;
      });
      return new Response(JSON.stringify({ files: matched }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 5. Multipart create file
    if (urlStr.includes('/upload/drive/v3/files') && init?.method === 'POST') {
      const body = String(init.body);
      const metadataMatch = body.match(/\{[\s\S]*?\}/);
      const metadata = metadataMatch ? JSON.parse(metadataMatch[0]) : { name: 'unknown' };
      const contentParts = body.split('\r\n\r\n');
      const content = contentParts.length >= 3 ? contentParts[2].split('\r\n--')[0] : '';
      const fileId = 'gdrive_' + crypto.randomUUID().slice(0, 8);
      mockDriveStorage.set(metadata.name, { id: fileId, name: metadata.name, content });
      return new Response(JSON.stringify({ id: fileId, name: metadata.name }), { status: 200 });
    }

    // 6. Patch file media
    if (urlStr.includes('/upload/drive/v3/files/') && init?.method === 'PATCH') {
      const fileId = urlStr.split('/upload/drive/v3/files/')[1].split('?')[0];
      const file = Array.from(mockDriveStorage.values()).find((f) => f.id === fileId);
      if (!file) return new Response('Not Found', { status: 404 });
      file.content = String(init.body);
      return new Response(JSON.stringify({ id: file.id, name: file.name }), { status: 200 });
    }

    return new Response('Mock Not Found', { status: 404 });
  };

  // 3A: First-ever sync locks canonical Google Account
  console.log('3A: Executing initial sync to establish canonical Google Account lock...');
  const firstSync = await performGoogleDriveSync(
    MASTER_PIN,
    'mock_client_id_01',
    'token_alex_01',
    mockDriveFetch
  );

  if (!firstSync.success) throw new Error('Initial sync failed');

  const settingsAfterFirst = await db.settings.get('current');
  console.log(`Locked account in settings: ${settingsAfterFirst?.approvedGoogleEmail} (${settingsAfterFirst?.approvedGoogleAccountId})`);
  if (settingsAfterFirst?.approvedGoogleEmail !== 'alex.finance@gmail.com') {
    throw new Error('Approved Google email was not locked in settings!');
  }

  const manifestFile = mockDriveStorage.get('financeflow_manifest.json');
  if (!manifestFile) throw new Error('Manifest not uploaded to Drive');
  const manifestData = JSON.parse(manifestFile.content);
  if (manifestData.approvedAccountEmail !== 'alex.finance@gmail.com') {
    throw new Error('Manifest on Drive missing approvedAccountEmail');
  }
  console.log('[PASS] First sync established approved account lock locally and in remote manifest.');

  // 3B: Subsequent sync with matching approved account succeeds
  console.log('3B: Testing subsequent sync with identical approved account...');
  const secondSync = await performGoogleDriveSync(
    MASTER_PIN,
    'mock_client_id_01',
    'token_alex_02',
    mockDriveFetch
  );
  if (!secondSync.success) throw new Error('Subsequent sync with approved account failed');
  console.log('[PASS] Subsequent sync with approved account succeeded normally.');

  // 3C: Accidental mismatch blocks immediately
  console.log('3C: Testing accidental sign-in with a different Google account (imposter)...');
  currentAuthUser = {
    id: 'goog_imposter_99999',
    email: 'imposter.user@gmail.com',
    name: 'Imposter User',
  };

  let mismatchBlocked = false;
  try {
    await performGoogleDriveSync(
      MASTER_PIN,
      'mock_client_id_01',
      'token_imposter_01',
      mockDriveFetch
    );
  } catch (err: any) {
    if (err.message.includes('This device signed in with a different Google account')) {
      mismatchBlocked = true;
      console.log(`[PASS] Correctly blocked unauthorized account with warning:\n  "${err.message}"`);
    } else {
      throw err;
    }
  }

  if (!mismatchBlocked) {
    throw new Error('CRITICAL SECURITY ERROR: Mismatched Google account was not blocked!');
  }

  // 3D: New second device with empty local settings rejects imposter based on remote manifest
  console.log('3D: Testing second device enforcement against remote manifest...');
  await db.settings.update('current', {
    approvedGoogleAccountId: undefined,
    approvedGoogleEmail: undefined,
  });

  let secondDeviceBlocked = false;
  try {
    await performGoogleDriveSync(
      MASTER_PIN,
      'mock_client_id_01',
      'token_imposter_02',
      mockDriveFetch
    );
  } catch (err: any) {
    if (err.message.includes('This device signed in with a different Google account')) {
      secondDeviceBlocked = true;
      console.log(`[PASS] Second device correctly blocked imposter via remote manifest verification.`);
    } else {
      throw err;
    }
  }

  if (!secondDeviceBlocked) {
    throw new Error('Second device did not enforce remote manifest approved account lock!');
  }

  // Restore authorized user
  currentAuthUser = {
    id: 'goog_user_112233',
    email: 'alex.finance@gmail.com',
    name: 'Alex Johnson',
  };

  // 3E: Deliberate "Change Approved Google Account" Migration Pathway
  console.log('3E: Testing PIN-gated "Change Approved Google Account" migration flow...');
  currentAuthUser = {
    id: 'goog_new_account_7788',
    email: 'alex.work@company.com',
    name: 'Alex Work Account',
  };

  const migrationResult = await changeApprovedGoogleAccount(
    MASTER_PIN,
    'mock_client_id_01',
    'token_alex_work_01',
    mockDriveFetch
  );

  console.log(`Migration completed: New approved email = ${migrationResult.approvedEmail}`);
  if (migrationResult.approvedEmail !== 'alex.work@company.com') {
    throw new Error('Approved account migration failed');
  }

  // Verify updated in local settings
  const settingsAfterMigration = await db.settings.get('current');
  if (settingsAfterMigration?.approvedGoogleEmail !== 'alex.work@company.com') {
    throw new Error('Settings not updated after migration');
  }

  // Verify updated in remote manifest on Drive
  const updatedManifestRaw = mockDriveStorage.get('financeflow_manifest.json');
  if (!updatedManifestRaw) throw new Error('Updated manifest not found on Drive');
  const updatedManifest = JSON.parse(updatedManifestRaw.content);
  if (updatedManifest.approvedAccountEmail !== 'alex.work@company.com') {
    throw new Error('Remote manifest on Drive was not updated with migrated approved account');
  }

  // Verify subsequent sync with new account succeeds
  const syncWithNewAccount = await performGoogleDriveSync(
    MASTER_PIN,
    'mock_client_id_01',
    'token_alex_work_02',
    mockDriveFetch
  );
  if (!syncWithNewAccount.success) {
    throw new Error('Subsequent sync with newly migrated approved account failed');
  }
  console.log('[PASS] PIN-gated account migration successfully transferred canonical lock to alex.work@company.com!');

  console.log('\n🎉 ALL SINGLE-USER MULTI-DEVICE SYNC ENHANCEMENT TESTS PASSED WITH 100% SUCCESS! 🎉\n');
}

runSyncEnhancementsTests().catch((err) => {
  console.error('\n❌ SYNC ENHANCEMENTS TEST FAILED:', err);
  process.exit(1);
});
