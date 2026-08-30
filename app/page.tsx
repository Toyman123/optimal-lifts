"use client";

import { useMemo, useState } from "react";
import { ChartsScreen } from "./components/ChartsScreen";
import { ConfirmScreen } from "./components/ConfirmScreen";
import { DayPicker } from "./components/DayPicker";
import { HistoryScreen } from "./components/HistoryScreen";
import { LiftChartScreen } from "./components/LiftChartScreen";
import { NoteScreen } from "./components/NoteScreen";
import { SettingsScreen } from "./components/SettingsScreen";
import { TabBar, type Tab } from "./components/TabBar";
import { buildNoteFromLog, buildNoteTemplate, parseNote } from "./lib/note";
import { dayOfWorkout, suggestDay, todayISO } from "./lib/metrics";
import { DAYS, exerciseById, exercisesForDay } from "./lib/exercises";
import { useDraft } from "./lib/draft";
import { useLog } from "./lib/store";
import type { DayKey } from "./lib/types";

export default function Home() {
  const {
    ready,
    state,
    replaceWorkout,
    addExercise,
    removeExercise,
    moveExercise,
    clearHistory,
    resetRoutine,
  } = useLog();
  const { ready: draftReady, draft, setDraft, setText } = useDraft();

  const today = useMemo(() => todayISO(), []);
  const [tab, setTab] = useState<Tab>("note");
  const [confirming, setConfirming] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  if (!ready || !draftReady) {
    return (
      <div className="mx-auto w-full max-w-[430px] px-5 pt-7">
        <span className="title-lg">OptimalLifts</span>
      </div>
    );
  }

  const routine = state.exercises;

  /** A fresh note for a day, seeded with that day's lift names. */
  function startNote(day: DayKey, date: string) {
    setDraft({
      day,
      date,
      text: buildNoteTemplate(exercisesForDay(routine, day)),
    });
    setConfirming(false);
    setTab("note");
  }

  /** Reopens a logged workout as the note it would have been written as. */
  function editWorkout(date: string, day: DayKey) {
    setDraft({
      day,
      date,
      text: buildNoteFromLog(routine, state.entries, state.notes, date, day),
    });
    setConfirming(false);
    setOpenId(null);
    setTab("note");
  }

  /**
   * Switches which split the note is for. The note is seeded with the day's
   * lift names, so this has to reseed it — which would throw away anything
   * already written. Silent when the note is still untouched (the common
   * case: wrong split picked a moment ago), confirmed when it isn't.
   */
  function changeDay(next: DayKey) {
    if (!draft || next === draft.day) return;

    const untouched =
      draft.text.trim() ===
      buildNoteTemplate(exercisesForDay(routine, draft.day)).trim();
    const label = DAYS.find((d) => d.key === next)?.label ?? next;

    if (
      !untouched &&
      !confirm(
        `Switch to ${label}? What you have written will be replaced with ${label}'s lifts.`,
      )
    ) {
      return;
    }

    setDraft({
      ...draft,
      day: next,
      text: buildNoteTemplate(exercisesForDay(routine, next)),
    });
  }

  /** Commits the note as the whole of that day's workout. */
  function commit() {
    if (!draft) return;
    const parsed = parseNote(draft.text, routine, draft.day);

    // New lifts have to join the routine before the entries referencing them
    // are written, or they would log against an id nothing points at.
    for (const lift of parsed.lifts) {
      if (lift.isNew && lift.sets.length) {
        addExercise(lift.exercise.name, draft.day, Boolean(lift.exercise.bodyweight));
      }
    }

    const items = parsed.lifts
      .filter((l) => l.sets.length)
      .map((l) => ({ exerciseId: l.exercise.id, sets: l.sets }));
    const comments: Record<string, string> = {};
    for (const l of parsed.lifts) {
      if (l.comment && l.sets.length) comments[l.exercise.id] = l.comment;
    }

    replaceWorkout(draft.date, draft.day, items, comments);
    setDraft(null);
    setConfirming(false);
    setTab("history");
  }

  let body: React.ReactNode = null;

  /* -- Note ------------------------------------------------------------- */
  if (tab === "note") {
    if (!draft) {
      body = (
        <DayPicker
          date={today}
          routine={routine}
          suggested={suggestDay(state.entries)}
          onPick={(d) => startNote(d, today)}
        />
      );
    } else if (confirming) {
      body = (
        <ConfirmScreen
          parsed={parseNote(draft.text, routine, draft.day)}
          date={draft.date}
          onConfirm={commit}
          onBack={() => setConfirming(false)}
        />
      );
    } else {
      body = (
        <NoteScreen
          day={draft.day}
          date={draft.date}
          text={draft.text}
          routine={routine}
          onChange={setText}
          onChangeDay={changeDay}
          onSave={() => setConfirming(true)}
          onDiscard={() => {
            if (confirm("Throw away this note? Nothing has been saved yet.")) {
              setDraft(null);
            }
          }}
        />
      );
    }
  }

  /* -- Charts ----------------------------------------------------------- */
  if (tab === "charts") {
    const open = openId ? exerciseById(routine, openId) : undefined;
    body = open ? (
      <LiftChartScreen
        key={open.id}
        exercise={open}
        entries={state.entries}
        notes={state.notes}
        today={today}
        onBack={() => setOpenId(null)}
        onEditSession={(date) =>
          editWorkout(date, dayOfWorkout(state.entries, date, open.id) ?? open.day)
        }
      />
    ) : (
      <ChartsScreen
        routine={routine}
        entries={state.entries}
        onOpen={setOpenId}
      />
    );
  }

  /* -- History ---------------------------------------------------------- */
  if (tab === "history") {
    body = <HistoryScreen entries={state.entries} onOpen={editWorkout} />;
  }

  /* -- Settings --------------------------------------------------------- */
  if (tab === "settings") {
    body = (
      <SettingsScreen
        state={state}
        day={draft?.day ?? suggestDay(state.entries)}
        onAddExercise={addExercise}
        onRemoveExercise={removeExercise}
        onMoveExercise={moveExercise}
        onResetRoutine={resetRoutine}
        onClearHistory={clearHistory}
      />
    );
  }

  return (
    <>
      {body}
      <TabBar
        tab={tab}
        onChange={(t) => {
          setOpenId(null);
          setTab(t);
        }}
      />
    </>
  );
}
