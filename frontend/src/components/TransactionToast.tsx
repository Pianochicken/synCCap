import React from 'react';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';

interface TransactionToastProps {
  message: string;
  updateId?: string;
  toastId?: string;
}

export const TransactionToast: React.FC<TransactionToastProps> = ({ message, updateId, toastId }) => {
  return (
    <div className="flex flex-col gap-1 pr-6 relative w-full">
      <span className="font-medium text-[15px]">{message}</span>
      {updateId && (
        <a
          href={`https://lighthouse.devnet.cantonloop.com/transactions/${updateId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:text-blue-600 underline truncate mt-1"
          title="View on Canton Explorer"
        >
          Tx: {updateId.slice(0, 8)}...{updateId.slice(-6)}
        </a>
      )}
      {toastId && (
        <button
          onClick={() => toast.dismiss(toastId)}
          className="absolute -right-2 -top-1 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          title="Close"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
