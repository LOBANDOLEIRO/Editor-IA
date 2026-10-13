import type { Metadata } from "next";
import Editor from "@/components/Editor";
import { authEnabled } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Editor — Editor IA" };

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string; projeto?: string; novo?: string }>;
}) {
  const { template, projeto, novo } = await searchParams;
  return (
    <Editor
      key={projeto ?? template ?? (novo ? "novo" : "rascunho")}
      initialTemplate={template ?? (novo ? "reels-promo" : undefined)}
      projectId={projeto}
      authEnabled={authEnabled}
    />
  );
}
