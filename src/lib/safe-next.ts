// Só aceita caminhos do próprio site no redirecionamento pós-login
// (evita links de login que levam para sites de terceiros).
export function safeNext(next: string | null | undefined, fallback = "/editor"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
