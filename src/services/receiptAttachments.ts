/**
 * Receipt Attachments Service
 * Manages compressed receipt image blobs in Dexie v6 (receipt_attachments table)
 * Computes storage footprint against the 2.0 GB soft ceiling.
 */

import { db } from '../db/database';
import { compressReceiptImage } from './imageCompression';
import type { ReceiptAttachment } from '../types';

export async function attachReceiptToTransaction(
  transactionId: string,
  imageDataUrlOrBase64: string
): Promise<ReceiptAttachment> {
  const compressed = await compressReceiptImage(imageDataUrlOrBase64, 1024, 0.75);
  const attachmentId = 'rcpt_' + crypto.randomUUID().slice(0, 8);

  const record: ReceiptAttachment = {
    id: attachmentId,
    transactionId,
    mimeType: compressed.mimeType,
    sizeBytes: compressed.sizeBytes,
    width: compressed.width,
    height: compressed.height,
    dataBase64: compressed.dataBase64,
    createdAt: Date.now(),
    isDeleted: false,
  };

  // Check if an existing attachment exists for this transaction and update/replace
  const existing = await db.receipt_attachments
    .where('transactionId')
    .equals(transactionId)
    .filter((r) => !r.isDeleted)
    .first();

  if (existing) {
    await db.receipt_attachments.update(existing.id, {
      ...record,
      id: existing.id,
      createdAt: Date.now(),
    });
    return { ...record, id: existing.id };
  }

  await db.receipt_attachments.add(record);
  return record;
}

export async function getReceiptAttachment(transactionId: string): Promise<ReceiptAttachment | null> {
  const attachment = await db.receipt_attachments
    .where('transactionId')
    .equals(transactionId)
    .filter((r) => !r.isDeleted)
    .first();

  return attachment || null;
}

export async function deleteReceiptAttachment(transactionId: string): Promise<void> {
  const existing = await db.receipt_attachments
    .where('transactionId')
    .equals(transactionId)
    .filter((r) => !r.isDeleted)
    .first();

  if (existing) {
    await db.receipt_attachments.update(existing.id, { isDeleted: true });
  }
}

/**
 * Calculates the total size in bytes consumed by active receipt attachments
 */
export async function calculateReceiptsStorageBytes(): Promise<number> {
  try {
    const receipts = await db.receipt_attachments.filter((r) => !r.isDeleted).toArray();
    return receipts.reduce((sum, r) => sum + (r.sizeBytes || 0), 0);
  } catch {
    return 0;
  }
}
