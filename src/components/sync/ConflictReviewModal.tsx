import React from 'react';
import { X, AlertTriangle, RotateCcw } from 'lucide-react';
import type { SyncConflictRecord } from '../../types';
import { restoreSupersededConflictRecord } from '../../services/sync';

interface ConflictReviewModalProps {
  conflicts: SyncConflictRecord[];
  onClose: () => void;
  onConflictResolved?: () => void;
}

export const ConflictReviewModal: React.FC<ConflictReviewModalProps> = ({
  conflicts,
  onClose,
  onConflictResolved,
}) => {
  const [restoringId, setRestoringId] = React.useState<string | null>(null);

  const handleRestore = async (conflict: SyncConflictRecord) => {
    setRestoringId(conflict.id);
    try {
      await restoreSupersededConflictRecord(conflict);
      onConflictResolved?.();
    } catch (err: any) {
      alert('Failed to restore record: ' + err.message);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Sync Conflict Review</h3>
              <p className="text-xs text-slate-400">
                Resolved automatically using Last-Write-Wins (LWW). You can revert any superseded record.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Conflict List */}
        <div className="p-6 overflow-y-auto space-y-4">
          {conflicts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No active conflicts detected. All devices are fully synchronized.
            </div>
          ) : (
            conflicts.map((conflict) => {
              const winning = conflict.winningRecord || {};
              const superseded = conflict.supersededVersion || {};

              return (
                <div
                  key={conflict.id}
                  className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400">
                      {conflict.entityType} Conflict
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {new Date(conflict.resolvedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 font-medium">
                    {conflict.reason}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
                    {/* Winning Record */}
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
                      <div className="flex items-center justify-between text-emerald-400 font-bold">
                        <span>Active ({conflict.winningSide === 'local' ? 'Local' : 'Remote'})</span>
                        <span>Winner</span>
                      </div>
                      <div className="font-mono text-slate-300 truncate">
                        Desc: {winning.description || winning.name || winning.title || winning.personName || winning.id}
                      </div>
                      <div className="font-mono text-slate-400">
                        Amount: {winning.amount ?? winning.originalAmount ?? winning.currentBalance ?? '-'}
                      </div>
                    </div>

                    {/* Superseded Record */}
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                      <div className="flex items-center justify-between text-slate-400 font-bold">
                        <span>Superseded ({conflict.winningSide === 'local' ? 'Remote' : 'Local'})</span>
                        <span>Archived</span>
                      </div>
                      <div className="font-mono text-slate-300 truncate">
                        Desc: {superseded.description || superseded.name || superseded.title || superseded.personName || superseded.id}
                      </div>
                      <div className="font-mono text-slate-400">
                        Amount: {superseded.amount ?? superseded.originalAmount ?? superseded.currentBalance ?? '-'}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleRestore(conflict)}
                      disabled={restoringId === conflict.id}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
                      <span>{restoringId === conflict.id ? 'Restoring...' : 'Restore Superseded Version'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
