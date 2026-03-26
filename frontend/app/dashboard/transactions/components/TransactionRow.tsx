'use client';

import React from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Repeat,
  Sparkles,
  FileText,
} from 'lucide-react';

export type TransactionType = 'deposit' | 'withdraw' | 'swap' | 'yield';
export type TransactionStatus = 'completed' | 'pending';

export interface TransactionRowProps {
  date: string; // ISO date-time or human readable
  time: string;
  transactionId: string;
  type: TransactionType;
  assetDetails: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  onClick?(id: string): void;
}

const typeMeta: Record<TransactionType, { icon: React.ReactNode; label: string; style: string }> = {
  deposit: {
    icon: <ArrowDownCircle size={18} className="text-emerald-400" />,
    label: 'Deposit',
    style: 'text-emerald-200',
  },
  withdraw: {
    icon: <ArrowUpCircle size={18} className="text-rose-400" />,
    label: 'Withdraw',
    style: 'text-rose-200',
  },
  swap: {
    icon: <Repeat size={18} className="text-cyan-300" />,
    label: 'Swap',
    style: 'text-cyan-200',
  },
  yield: {
    icon: <Sparkles size={18} className="text-amber-300" />,
    label: 'Yield',
    style: 'text-amber-200',
  },
};

const statusMeta: Record<TransactionStatus, { label: string; style: string }> = {
  completed: {
    label: 'Completed',
    style: 'bg-emerald-200/15 text-emerald-200 border-emerald-100/30',
  },
  pending: {
    label: 'Pending',
    style: 'bg-amber-200/15 text-amber-200 border-amber-100/30',
  },
};

function formatAmount(amount: number): string {
  const abs = Math.abs(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? '-' : '+'}$${abs}`;
}

export default function TransactionRow({
  date,
  time,
  transactionId,
  type,
  assetDetails,
  amount,
  currency,
  status,
  onClick,
}: TransactionRowProps) {
  const typeInfo = typeMeta[type];
  const statusInfo = statusMeta[status];
  const amountStyle = amount >= 0 ? 'text-emerald-300' : 'text-rose-300';

  return (
    <div
      className="grid grid-cols-12 items-center gap-3 px-5 py-4 border-b border-white/10 text-sm md:text-base hover:bg-white/5 transition-colors cursor-pointer"
      onClick={() => onClick?.(transactionId)}
    >
      <div className="col-span-2">
        <p className="text-[#b1d7da] font-medium">{date}</p>
        <p className="text-[#6c9da3] text-xs mt-0.5">{time}</p>
      </div>

      <div className="col-span-3">
        <p className="text-white font-semibold">{transactionId}</p>
        <div className="inline-flex items-center gap-2 text-xs mt-1 text-[#6c9da3]">
          {typeInfo.icon}
          <span className={typeInfo.style}>{typeInfo.label}</span>
        </div>
      </div>

      <div className="col-span-3 text-[#c9eef5]">{assetDetails}</div>

      <div className={`col-span-2 text-right font-semibold ${amountStyle}`}>
        {formatAmount(amount)} <span className="text-[#6faab0] text-xs">{currency}</span>
      </div>

      <div className="col-span-2 text-right">
        <span
          className={`inline-flex items-center justify-center px-3 py-1 text-xs font-semibold rounded-full border ${statusInfo.style}`}
        >
          {statusInfo.label}
        </span>
      </div>
    </div>
  );
}
