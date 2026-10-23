import React, { useState } from 'react';
import { X, Camera, Upload, AlertTriangle, CheckCircle, RefreshCw, Sparkles } from 'lucide-react';
import { scanReceiptImage, createProposalFromOCR } from '../../services/ocr';
import type { OCRScanResult, ActionProposal, Account, Category, CurrencyCode } from '../../types';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
  baseCurrency: CurrencyCode;
  onProposalGenerated: (proposal: ActionProposal) => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  accounts,
  categories,
  baseCurrency,
  onProposalGenerated,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<OCRScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage('');
    setScanResult(null);
    setIsScanning(true);
    setProgress(5);
    setStatusText('Reading image file...');

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    try {
      const result = await scanReceiptImage(file, (p, s) => {
        setProgress(p);
        setStatusText(s);
      });

      setScanResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to scan receipt image.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleCommitProposal = () => {
    if (!scanResult) return;
    const proposal = createProposalFromOCR(scanResult, accounts, categories, baseCurrency);
    onProposalGenerated(proposal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Smart Receipt & Bill OCR</h3>
              <p className="text-xs text-slate-400">Offline-ready on-demand OCR (Tesseract.js)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* File Upload Zone */}
          {!previewUrl && (
            <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center space-y-3 cursor-pointer transition bg-slate-950/40">
              <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-400">
                <Upload className="w-8 h-8" />
              </div>
              <div className="text-center">
                <span className="font-bold text-white text-sm block">Upload or Capture Receipt</span>
                <span className="text-slate-400 text-xs">PNG, JPG, or WebP (max 10MB)</span>
              </div>
              <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
            </label>
          )}

          {/* Image Preview & Progress */}
          {previewUrl && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 max-h-56 bg-slate-950 flex items-center justify-center">
                <img src={previewUrl} alt="Receipt Preview" className="max-h-56 object-contain" />
              </div>

              {isScanning && (
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center space-x-2 text-indigo-400 font-semibold">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{statusText}</span>
                    </span>
                    <span className="font-mono text-slate-400">{progress}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Extracted Details */}
          {scanResult && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                  <CheckCircle className="w-4 h-4" />
                  <span>OCR Extraction Completed ({scanResult.confidence}% confidence)</span>
                </div>
                {scanResult.isDuplicate && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Duplicate Receipt</span>
                  </span>
                )}
              </div>

              {scanResult.isDuplicate && (
                <p className="text-amber-400/90 text-[11px] bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                  This exact receipt image was already logged previously. Double-check before submitting to avoid duplicate entries.
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Merchant</span>
                  <span className="text-white font-bold truncate block">{scanResult.merchantName}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Date</span>
                  <span className="text-white font-bold block">{scanResult.date}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Total Amount</span>
                  <span className="text-emerald-400 font-bold text-sm block">
                    {(scanResult.totalAmount || 0).toLocaleString()} {baseCurrency}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Tax / PPN</span>
                  <span className="text-slate-300 block">
                    {scanResult.taxAmount ? `${scanResult.taxAmount.toLocaleString()} ${baseCurrency}` : 'None'}
                  </span>
                </div>
              </div>

              {/* Raw text snippet */}
              <details className="text-[11px] text-slate-500">
                <summary className="cursor-pointer hover:text-slate-400">View Raw OCR Text Dump</summary>
                <pre className="mt-2 p-2 bg-slate-900 rounded-lg text-[10px] overflow-x-auto whitespace-pre-wrap max-h-32">
                  {scanResult.rawText}
                </pre>
              </details>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          {previewUrl && !isScanning ? (
            <label className="text-xs text-slate-400 hover:text-white cursor-pointer transition">
              Upload Another
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          ) : (
            <div />
          )}

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Cancel
            </button>

            {scanResult && (
              <button
                onClick={handleCommitProposal}
                className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Prepare Action Proposal</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
