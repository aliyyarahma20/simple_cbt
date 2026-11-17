import { Suspense } from "react";
import EditExamClient from "./EditExamClient";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function EditExamContent({ params }: PageProps) {
  const { id } = await params;

  return <EditExamClient id={id} />;
}

export default function EditExamPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#F5F8FC]">
          <p className="text-sm font-medium text-[#15395D]">
            Memuat halaman edit ujian...
          </p>
        </main>
      }
    >
      <EditExamContent params={params} />
    </Suspense>
  );
}