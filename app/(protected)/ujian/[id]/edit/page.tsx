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
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-sm font-medium text-[#15395D]">
            Memuat halaman edit ujian...
          </p>
        </div>
      }
    >
      <EditExamContent params={params} />
    </Suspense>
  );
}