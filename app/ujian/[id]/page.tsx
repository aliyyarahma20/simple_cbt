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
        <main className="flex min-h-screen items-center justify-center bg-[#F5F8FC]">
          <p className="text-sm font-medium text-[#15395D]">
            Memuat detail ujian...
          </p>
        </main>
      }
    >
      <ExamDetailContent params={params} />
    </Suspense>
  );
}