import { Suspense } from "react";
import MonitoringExamClient from "./MonitoringExamClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function MonitoringExamContent({ params }: PageProps) {
  const { id } = await params;

  return <MonitoringExamClient id={id} />;
}

export default function MonitoringExamPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F5F8FC]">
          <p className="text-sm font-medium text-[#15395D]">
            Memuat pemantauan ujian...
          </p>
        </main>
      }
    >
      <MonitoringExamContent params={params} />
    </Suspense>
  );
}