/**
 * Google Drive Sync Client for FinanceFlow
 * Uses Google Identity Services (GIS) token client and direct Google Drive v3 REST API.
 * Operates strictly within the isolated, private `appDataFolder`.
 * All data payloads are client-side encrypted with AES-GCM-256 before transmission.
 */

import { encryptData, decryptData, type EncryptedPayload } from './crypto';
import type { SyncManifest, SyncPayloadData } from '../types';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => {
            requestAccessToken: () => void;
          };
          revoke?: (token: string, done: () => void) => void;
        };
      };
    };
  }
}

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const APP_DATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata email';

const MANIFEST_FILE_NAME = 'financeflow_manifest.json';
const DATA_SYNC_FILE_NAME = 'financeflow_data_latest.enc';

// In-memory token cache
let currentAccessToken: string | null = null;
let tokenExpiresAt = 0;

export function getCachedAccessToken(): string | null {
  if (currentAccessToken && Date.now() < tokenExpiresAt) {
    return currentAccessToken;
  }
  return null;
}

export function setCachedAccessToken(token: string | null, expiresInSeconds: number = 3500): void {
  currentAccessToken = token;
  tokenExpiresAt = token ? Date.now() + expiresInSeconds * 1000 : 0;
}

/**
 * Dynamically loads the Google Identity Services (GIS) client script if not already present
 */
export async function loadGisScript(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (window.google?.accounts?.oauth2) return;

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity script')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

/**
 * Request an OAuth2 Access Token for Google Drive appDataFolder
 */
export async function requestGoogleDriveAuth(clientId: string): Promise<string> {
  await loadGisScript();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services is not available in this environment.');
  }

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts!.oauth2!.initTokenClient({
      client_id: clientId,
      scope: APP_DATA_SCOPE,
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(`Google authentication failed: ${resp.error}`));
        } else if (resp.access_token) {
          setCachedAccessToken(resp.access_token);
          resolve(resp.access_token);
        } else {
          reject(new Error('No access token received from Google Identity Services.'));
        }
      },
    });

    client.requestAccessToken();
  });
}

/**
 * Fetch profile info of the authenticated Google user (email, name, and unique Google account ID)
 */
export async function fetchGoogleProfile(
  accessToken: string,
  fetchFn = fetch
): Promise<{ email: string; name: string; id: string }> {
  // Strategy 1: Drive about endpoint (always succeeds with drive.appdata scope)
  try {
    const driveResp = await fetchFn('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (driveResp.ok) {
      const data = await driveResp.json();
      if (data.user?.emailAddress) {
        return {
          email: data.user.emailAddress,
          name: data.user.displayName || 'Google User',
          id: data.user.permissionId || data.user.emailAddress,
        };
      }
    }
  } catch (err) {
    console.warn('Drive about user fetch failed:', err);
  }

  // Strategy 2: OAuth2 userinfo endpoint
  try {
    const resp = await fetchFn(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (resp.ok) {
      const data = await resp.json();
      return {
        email: data.email || 'Google User',
        name: data.name || 'Google User',
        id: data.sub || data.id || data.email || 'unknown_google_id',
      };
    }
  } catch (err) {
    console.warn('Userinfo fetch failed:', err);
  }

  // Fallback: Never crash or block connection if profile metadata fetch fails
  return {
    email: 'Connected Google Account',
    name: 'Google User',
    id: 'fallback_google_account_id',
  };
}

/**
 * Find a file in Google Drive's appDataFolder by name
 */
export async function findAppDataFile(
  filename: string,
  accessToken: string,
  fetchFn = fetch
): Promise<{ id: string; name: string; modifiedTime: string } | null> {
  const q = encodeURIComponent(`name = '${filename}' and trashed = false`);
  const url = `${DRIVE_API_URL}?spaces=appDataFolder&q=${q}&fields=files(id,name,modifiedTime,size)`;

  const resp = await fetchFn(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    let detail = '';
    try {
      const errJson = await resp.json();
      detail = errJson?.error?.message || '';
    } catch {}

    if (resp.status === 403) {
      throw new Error(
        detail ||
        'Google Drive API belum diaktifkan di Google Cloud Console. Silakan aktifkan "Google Drive API" di Google Cloud Console lalu coba lagi.'
      );
    }
    throw new Error(`Drive search failed: ${resp.status} ${detail || resp.statusText}`);
  }

  const data = await resp.json();
  if (data.files && data.files.length > 0) {
    return data.files[0];
  }
  return null;
}

/**
 * Download file content from Google Drive appDataFolder
 */
export async function downloadAppDataFile(
  fileId: string,
  accessToken: string,
  fetchFn = fetch
): Promise<string> {
  const url = `${DRIVE_API_URL}/${fileId}?alt=media`;
  const resp = await fetchFn(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    let detail = '';
    try {
      const errJson = await resp.json();
      detail = errJson?.error?.message || '';
    } catch {}

    if (resp.status === 403) {
      throw new Error(
        detail ||
        'Google Drive API belum diaktifkan di Google Cloud Console. Silakan aktifkan "Google Drive API" di Google Cloud Console lalu coba lagi.'
      );
    }
    throw new Error(`Drive download failed: ${resp.status} ${detail || resp.statusText}`);
  }

  return await resp.text();
}

/**
 * Upload (create or update) a file in Google Drive appDataFolder
 */
export async function uploadAppDataFile(
  filename: string,
  content: string,
  accessToken: string,
  contentType = 'application/json',
  fetchFn = fetch
): Promise<string> {
  const existing = await findAppDataFile(filename, accessToken, fetchFn);

  if (existing) {
    // Update existing file content
    const updateUrl = `${DRIVE_UPLOAD_URL}/${existing.id}?uploadType=media`;
    const resp = await fetchFn(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': contentType,
      },
      body: content,
    });

    if (!resp.ok) {
      let detail = '';
      try {
        const errJson = await resp.json();
        detail = errJson?.error?.message || '';
      } catch {}

      if (resp.status === 403) {
        throw new Error(
          detail ||
          'Google Drive API belum diaktifkan di Google Cloud Console. Silakan aktifkan "Google Drive API" di Google Cloud Console lalu coba lagi.'
        );
      }
      throw new Error(`Drive file update failed: ${resp.status} ${detail || resp.statusText}`);
    }

    const resJson = await resp.json();
    return resJson.id || existing.id;
  } else {
    // Create new file with multipart upload
    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: filename,
      parents: ['appDataFolder'],
      mimeType: contentType,
    };

    const multipartRequestBody =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      `Content-Type: ${contentType}\r\n\r\n` +
      content +
      closeDelimiter;

    const createUrl = `${DRIVE_UPLOAD_URL}?uploadType=multipart`;
    const resp = await fetchFn(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    });

    if (!resp.ok) {
      let detail = '';
      try {
        const errJson = await resp.json();
        detail = errJson?.error?.message || '';
      } catch {}

      if (resp.status === 403) {
        throw new Error(
          detail ||
          'Google Drive API belum diaktifkan di Google Cloud Console. Silakan aktifkan "Google Drive API" di Google Cloud Console lalu coba lagi.'
        );
      }
      throw new Error(`Drive multipart create failed: ${resp.status} ${detail || resp.statusText}`);
    }

    const resJson = await resp.json();
    return resJson.id;
  }
}

/**
 * High-level: Upload Manifest and Encrypted Payload to Google Drive
 */
export async function uploadEncryptedSyncToDrive(
  manifest: SyncManifest,
  payloadData: SyncPayloadData,
  masterPin: string,
  accessToken: string,
  fetchFn = fetch
): Promise<void> {
  // 1. Encrypt payload with user PIN (PBKDF2 -> AES-GCM-256)
  const encryptedPayload = await encryptData(payloadData, masterPin);
  const encryptedPayloadStr = JSON.stringify(encryptedPayload);

  // 2. Upload Encrypted Data Payload to appDataFolder
  await uploadAppDataFile(
    DATA_SYNC_FILE_NAME,
    encryptedPayloadStr,
    accessToken,
    'application/octet-stream',
    fetchFn
  );

  // 3. Upload Sync Manifest
  const manifestStr = JSON.stringify(manifest, null, 2);
  await uploadAppDataFile(
    MANIFEST_FILE_NAME,
    manifestStr,
    accessToken,
    'application/json',
    fetchFn
  );
}

/**
 * High-level: Download Manifest and Encrypted Payload from Google Drive
 */
export async function downloadEncryptedSyncFromDrive(
  masterPin: string,
  accessToken: string,
  fetchFn = fetch
): Promise<{
  manifest: SyncManifest | null;
  payload: SyncPayloadData | null;
}> {
  // 1. Find and fetch manifest
  const manifestFile = await findAppDataFile(MANIFEST_FILE_NAME, accessToken, fetchFn);
  if (!manifestFile) {
    return { manifest: null, payload: null };
  }

  const manifestRaw = await downloadAppDataFile(manifestFile.id, accessToken, fetchFn);
  const manifest: SyncManifest = JSON.parse(manifestRaw);

  // 2. Find and fetch encrypted data
  const dataFile = await findAppDataFile(DATA_SYNC_FILE_NAME, accessToken, fetchFn);
  if (!dataFile) {
    return { manifest, payload: null };
  }

  const encryptedRaw = await downloadAppDataFile(dataFile.id, accessToken, fetchFn);
  const encryptedPayload: EncryptedPayload = JSON.parse(encryptedRaw);

  // 3. Decrypt with master PIN
  const decryptedDataStr = await decryptData(encryptedPayload, masterPin);
  const payload: SyncPayloadData = typeof decryptedDataStr === 'string' ? JSON.parse(decryptedDataStr) : decryptedDataStr;

  return { manifest, payload };
}
