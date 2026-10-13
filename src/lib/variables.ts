// Leitura e escrita das variáveis declaradas em `data-composition-variables`
// no <html> da composição. Os valores editados no formulário ficam gravados
// como `default` de cada variável, então o próprio HTML é a fonte da verdade
// (vale para a prévia, para o render e para a IA).

export type CompositionVariable = {
  id: string;
  type: "string" | "color" | "number" | string;
  label?: string;
  default?: string | number | boolean;
  // Dica só para o editor: "image" mostra um campo de upload.
  editor?: "image" | "textarea" | string;
};

const ATTR_RE = /data-composition-variables\s*=\s*(?:'([^']*)'|"([^"]*)")/;

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function encodeForSingleQuotes(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/'/g, "&#39;");
}

export function readVariables(html: string): CompositionVariable[] {
  const match = ATTR_RE.exec(html);
  if (!match) return [];
  try {
    const parsed = JSON.parse(decodeEntities(match[1] ?? match[2] ?? "[]"));
    return Array.isArray(parsed)
      ? parsed.filter((v) => v && typeof v.id === "string")
      : [];
  } catch {
    return [];
  }
}

export function writeVariables(html: string, variables: CompositionVariable[]): string {
  const value = `data-composition-variables='${encodeForSingleQuotes(JSON.stringify(variables))}'`;
  if (ATTR_RE.test(html)) return html.replace(ATTR_RE, () => value);
  return html.replace(/<html\b/i, (tag) => `${tag} ${value}`);
}

export function setVariableValue(html: string, id: string, value: string | number): string {
  const variables = readVariables(html).map((v) => (v.id === id ? { ...v, default: value } : v));
  return writeVariables(html, variables);
}

export function compositionSize(html: string): { width: number; height: number } {
  const width = Number(/data-width\s*=\s*["']?(\d+)/.exec(html)?.[1] ?? 1920);
  const height = Number(/data-height\s*=\s*["']?(\d+)/.exec(html)?.[1] ?? 1080);
  return { width, height };
}

export function compositionDuration(html: string): number {
  const root = /<[^>]*data-composition-id[^>]*>/.exec(html)?.[0] ?? "";
  const duration = Number(/data-duration\s*=\s*["']?([\d.]+)/.exec(root)?.[1] ?? 0);
  return Number.isFinite(duration) ? duration : 0;
}
