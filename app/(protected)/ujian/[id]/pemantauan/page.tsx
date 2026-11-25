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
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm font-medium text-[#15395D]">
            Memuat pemantauan ujian...
          </p>
        </div>
      }
    >
      <MonitoringExamContent params={params} />
    </Suspense>
  );
}