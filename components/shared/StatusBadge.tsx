
type ExamStatus =
  | "Berlangsung"
  | "Menunggu"
  | "Terjadwal"
  | "Selesai";

interface StatusBadgeProps {
  status: ExamStatus;
  className?: string;
}

const statusStyles: Record<ExamStatus, string> = {
  Berlangsung: "bg-green-50 text-green-700",
  Menunggu: "bg-amber-50 text-amber-700",
  Terjadwal: "bg-blue-50 text-blue-700",
  Selesai: "bg-gray-100 text-gray-600",
};

export default function StatusBadge({
  status,
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${statusStyles[status]} ${className}`}
    >
      {status}
    </span>
  );
}
