import { notFound } from "next/navigation";
import { PreviewFrame } from "@/components/preview/preview-frame";
import { getPublishedFiles } from "@/lib/db/publications";
import { assembleSrcdoc } from "@/lib/sandbox/assemble-srcdoc";

export const dynamic = "force-dynamic";

export default async function PublishedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const published = await getPublishedFiles(slug);
  if (!published) notFound();

  const { html } = assembleSrcdoc(published.files);

  return (
    <PreviewFrame
      projectId={published.projectId}
      srcDoc={html}
      title="已发布应用"
      className="h-screen w-full border-0 bg-white"
    />
  );
}
