import type { Metadata } from "next";
import Editor from "@/components/Editor";

export const metadata: Metadata = { title: "Editor — Editor IA" };

export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  const { template } = await searchParams;
  return <Editor initialTemplate={template} />;
}
