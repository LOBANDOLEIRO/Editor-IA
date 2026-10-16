import { useCallback, useRef, useState } from "react";

const LIMIT = 80;
const MERGE_MS = 1200;

/**
 * Estado com desfazer/refazer. Mudanças seguidas com a mesma `key`
 * (arrastar, mexer num controle deslizante, digitar) viram um passo só.
 */
export function useHistory<T>(initial: () => T) {
  const [present, setPresent] = useState<T>(initial);
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const last = useRef<{ key: string | null; at: number }>({ key: null, at: 0 });
  const current = useRef(present);
  current.current = present;

  const set = useCallback((next: T | ((prev: T) => T), key: string | null = null) => {
    const prev = current.current;
    const value = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
    if (value === prev) return;
    const now = Date.now();
    const merge =
      key !== null &&
      key === last.current.key &&
      (key.startsWith("drag") || now - last.current.at < MERGE_MS);
    if (!merge) {
      past.current.push(prev);
      if (past.current.length > LIMIT) past.current.shift();
    }
    future.current = [];
    last.current = { key, at: now };
    current.current = value;
    setPresent(value);
  }, []);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (prev === undefined) return;
    future.current.push(current.current);
    last.current = { key: null, at: 0 };
    current.current = prev;
    setPresent(prev);
  }, []);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (next === undefined) return;
    past.current.push(current.current);
    last.current = { key: null, at: 0 };
    current.current = next;
    setPresent(next);
  }, []);

  /** Troca o estado sem criar passo de histórico (ex.: ao carregar o projeto salvo). */
  const replace = useCallback((value: T) => {
    past.current = [];
    future.current = [];
    last.current = { key: null, at: 0 };
    current.current = value;
    setPresent(value);
  }, []);

  return {
    state: present,
    set,
    undo,
    redo,
    replace,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  };
}
