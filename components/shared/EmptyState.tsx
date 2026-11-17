
import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title = "Belum ada data",
  description = "Data yang kamu cari belum tersedia.",
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        {icon ?? <Inbox size={30} />}
      </div>

      <h3 className="text-base font-semibold text-gray-800">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-500">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 rounded-lg bg-[#15395D] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#102f4d]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
