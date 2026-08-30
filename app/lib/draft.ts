"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { DayKey } from "./types";

/**
 * The note you are part-way through writing. Kept separate from the log
 * itself: a draft is protected typing, not history — nothing here reaches
 * the charts until it is saved. Persisted so closing the app mid-workout
 * cannot lose a session.
 */

const KEY = "optimallifts.draft.v1";

export type Draft = {
  day: DayKey;
  date: string;
  text: string;
};

const subscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

function read(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Draft>;
    if (typeof d?.text === "string" && typeof d?.date === "string" && d?.day) {
      return { day: d.day as DayKey, date: d.date, text: d.text };
    }
  } catch {
    // Unreadable draft is simply no draft.
  }
  return null;
}

export function useDraft() {
  const ready = useSyncExternalStore(subscribe, onClient, onServer);
  const [draft, setDraftState] = useState<Draft | null>(() =>
    typeof window === "undefined" ? null : read(),
  );

  useEffect(() => {
    try {
      if (draft) localStorage.setItem(KEY, JSON.stringify(draft));
      else localStorage.removeItem(KEY);
    } catch {
      // Storage blocked — the draft still lives for this session.
    }
  }, [draft]);

  const setDraft = useCallback((d: Draft | null) => setDraftState(d), []);

  const setText = useCallback((text: string) => {
    setDraftState((d) => (d ? { ...d, text } : d));
  }, []);

  return { ready, draft, setDraft, setText };
}
