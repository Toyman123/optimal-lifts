"use client";

import { useEffect, useRef, useState } from "react";
import { buildDigest, describeRoutine } from "../lib/summarize";
import type { Saved } from "../lib/types";

const PROMPTS = [
  "Where am I stalling?",
  "What should I add weight to?",
  "How is my push day trending?",
];

export function CoachPanel({ state }: { state: Saved }) {
  // null = still checking. The panel stays out of the way until we know a key
  // exists, so a keyless install shows nothing rather than a broken feature.
  const [available, setAvailable] = useState<boolean | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/coach")
      .then((r) => r.json())
      .then((d) => live && setAvailable(Boolean(d?.configured)))
      .catch(() => live && setAvailable(false));
    return () => {
      live = false;
      abort.current?.abort();
    };
  }, []);

  async function ask(q: string) {
    const text = q.trim();
    if (!text || busy) return;

    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    setBusy(true);
    setError("");
    setAnswer("");

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          digest: buildDigest(state),
          routine: describeRoutine(state),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const d = await res.json().catch(() => null);
        setError(d?.error ?? `Request failed (${res.status}).`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        setAnswer((a) => a + decoder.decode(value, { stream: true }));
      }
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") {
        setError("Lost the connection to the server.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!available) return null;

  const empty = state.entries.length === 0;

  return (
    <section className="pt-7">
      <h2 className="label px-1 pb-2">Ask about your progress</h2>

      <div className="group-card p-4">
        {empty ? (
          <p className="text-[15px] text-muted">
            Log a few sessions first — there is nothing to look at yet.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="chip"
                  disabled={busy}
                  onClick={() => {
                    setQuestion(p);
                    ask(p);
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            <label htmlFor="coach-q" className="sr-only">
              Your question
            </label>
            <textarea
              id="coach-q"
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(question);
                }
              }}
              placeholder="Am I stalling on pull-ups?"
              className="quick-field mt-3"
            />

            <button
              type="button"
              className="btn mt-2.5 w-full py-3"
              disabled={busy || !question.trim()}
              onClick={() => ask(question)}
            >
              {busy ? "Thinking…" : "Ask"}
            </button>

            {error && (
              <p className="mt-3 text-[14px] text-under" role="alert">
                {error}
              </p>
            )}

            {answer && (
              <div
                className="readout-fade mt-3 whitespace-pre-wrap text-[15px] leading-relaxed"
                aria-live="polite"
              >
                {answer}
              </div>
            )}

            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              Sends your training history to Anthropic to answer. Needs the
              server running — it will not work offline.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
