"use client";

import { formatLoad } from "../lib/metrics";
import type { NoteParse } from "../lib/note";
import { dayLabel } from "../lib/metrics";

type Props = {
  parsed: NoteParse;
  date: string;
  onConfirm: () => void;
  onBack: () => void;
};

/**
 * Last look before anything is written. The note is free text, so this is
 * where a misread line gets caught — showing what was understood, not just
 * asserting it worked.
 */
export function ConfirmScreen({ parsed, date, onConfirm, onBack }: Props) {
  const lifts = parsed.lifts.filter((l) => l.sets.length > 0);
  const total = lifts.reduce((n, l) => n + l.sets.length, 0);
  const trouble = parsed.lifts.flatMap((l) => l.problems);

  return (
    <div className="mx-auto w-full max-w-[430px] px-5 pb-32">
      <header className="pt-7">
        <button type="button" className="back-btn" onClick={onBack}>
          ‹ Back to note
        </button>
        <h1 className="title-lg mt-2">Save this?</h1>
        <p className="label mt-1">
          {dayLabel(date)} · {lifts.length} {lifts.length === 1 ? "lift" : "lifts"} ·{" "}
          {total} {total === 1 ? "set" : "sets"}
        </p>
      </header>

      <section className="card mt-6 overflow-hidden">
        {lifts.map((l) => (
          <div key={l.exercise.id} className="read-row">
            <span className="min-w-0 flex-1">
              <span className="lift-name block truncate">
                {l.exercise.name}
                {l.isNew && <span className="label"> · new lift</span>}
              </span>
              {l.comment && (
                <span className="label mt-0.5 block truncate">{l.comment}</span>
              )}
            </span>
            <span className="tnum shrink-0 text-[15px]">
              {l.sets
                .map((s) => `${formatLoad(s.weight, l.exercise.bodyweight)}×${s.reps}`)
                .join("  ")}
            </span>
          </div>
        ))}
      </section>

      {parsed.skipped.length > 0 && (
        <section className="mt-6">
          <p className="label">
            Not logged: {parsed.skipped.join(", ")}
          </p>
        </section>
      )}

      {(trouble.length > 0 || parsed.orphans.length > 0) && (
        <section className="mt-6">
          <p className="label">Couldn&apos;t read, so left out:</p>
          <ul className="mt-1">
            {trouble.map((t, i) => (
              <li key={`t${i}`} className="label">
                · {t}
              </li>
            ))}
            {parsed.orphans.map((o, i) => (
              <li key={`o${i}`} className="label">
                · &ldquo;{o}&rdquo;
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-[calc(49px+env(safe-area-inset-bottom))] z-10 border-t border-line bg-card">
        <div className="mx-auto flex max-w-[430px] gap-3 px-5 py-2.5">
          <button type="button" className="btn-quiet flex-1 py-2.5" onClick={onBack}>
            Keep editing
          </button>
          <button
            type="button"
            className="btn flex-1 py-2.5"
            disabled={total === 0}
            onClick={onConfirm}
          >
            Save workout
          </button>
        </div>
      </div>
    </div>
  );
}
