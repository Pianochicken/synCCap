import React from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, FileWarning } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText?: string;
  icon?: 'alert' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText = 'Cancel',
  icon = 'warning',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={!isLoading ? onCancel : undefined}
      ></div>
      
      <div className="relative bg-[var(--bg-surface)] border border-[var(--border-strong)] shadow-2xl rounded-xl p-6 max-w-sm w-full mx-auto transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            icon === 'alert' ? 'bg-red-500/10' : 'bg-yellow-500/10'
          }`}>
            {icon === 'alert' ? (
              <ShieldAlert className="w-5 h-5 text-red-500" />
            ) : (
              <FileWarning className="w-5 h-5 text-yellow-500" />
            )}
          </div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{title}</h3>
        </div>
        
        <p className="text-[var(--text-muted)] text-sm mb-6 leading-relaxed">
          {message}
        </p>
        
        <div className="flex gap-3 justify-end">
          <button 
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white shadow-lg transition-all disabled:opacity-50 ${
              icon === 'alert' 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' 
                : 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/20'
            }`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
