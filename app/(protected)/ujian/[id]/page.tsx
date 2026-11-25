import { Suspense } from "react";
import ExamDetailClient from "./ExamDetailClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function ExamDetailContent({ params }: PageProps) {
  const { id } = await params;

  return <ExamDetailClient id={id} />;
}

export default function ExamDetailPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm font-medium text-[#15395D]">
            Memuat detail ujian...
          </p>
        </div>
      }
    >
      <ExamDetailContent params={params} />
    </Suspense>
  );
}