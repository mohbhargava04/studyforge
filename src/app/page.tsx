"use client";

import { useMemo, useState } from "react";
import {
  buildStudyPlan,
  initialTopics,
  type PlannerConstraints,
  type Topic,
  type TopicStatus,
} from "@/lib/planner";

const statusStyle: Record<TopicStatus, string> = {
  completed: "bg-emerald-100 text-emerald-800",
  in_progress: "bg-amber-100 text-amber-800",
  not_started: "bg-slate-100 text-slate-600",
  struggling: "bg-rose-100 text-rose-800",
};

const focusOptions = [
  { id: "balanced", label: "Balanced", topicIds: ["bfs", "shortest-paths", "dp"] },
  { id: "graphs", label: "Graphs first", topicIds: ["bfs", "dfs", "shortest-paths", "mst"] },
  { id: "dp", label: "DP first", topicIds: ["dp"] },
];

function topicStatusLabel(status: TopicStatus) {
  return status.replace("_", " ");
}

export default function Home() {
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [selectedTopicId, setSelectedTopicId] = useState("bfs");
  const [constraints, setConstraints] = useState<PlannerConstraints>({
    days: 3,
    hoursPerDay: 2,
    prioritizedTopicIds: focusOptions[0].topicIds,
  });
  const [focus, setFocus] = useState("balanced");
  const [message, setMessage] = useState("Your plan is calculated from prerequisites, priority, effort, and available time.");

  const plan = useMemo(() => buildStudyPlan(topics, constraints), [topics, constraints]);
  const byId = useMemo(() => new Map(topics.map((topic) => [topic.id, topic])), [topics]);
  const selectedTopic = byId.get(selectedTopicId) ?? topics[0];
  const activeBlock = plan.blocks.find((block) => block.topicId === selectedTopic.id);
  const completedCount = topics.filter((topic) => topic.status === "completed").length;
  const scheduledIds = new Set(plan.selectedTopicIds);

  function planWith(nextTopics: Topic[], nextConstraints = constraints) {
    return buildStudyPlan(nextTopics, nextConstraints);
  }

  function updateTopic(id: string, patch: Partial<Topic>) {
    const nextTopics = topics.map((topic) => (topic.id === id ? { ...topic, ...patch } : topic));
    setTopics(nextTopics);
    return planWith(nextTopics);
  }

  function changeAvailability(key: "days" | "hoursPerDay", delta: number) {
    const nextConstraints = {
      ...constraints,
      [key]: Math.max(1, Math.min(key === "days" ? 7 : 4, constraints[key] + delta)),
    };
    const nextPlan = planWith(topics, nextConstraints);
    setConstraints(nextConstraints);
    setMessage(`Plan recalculated for ${nextPlan.capacityHours} available hours. Weighted coverage is now ${nextPlan.coverage}%.`);
  }

  function chooseFocus(optionId: string) {
    const option = focusOptions.find((item) => item.id === optionId) ?? focusOptions[0];
    const nextConstraints = { ...constraints, prioritizedTopicIds: option.topicIds };
    const nextPlan = planWith(topics, nextConstraints);
    setFocus(option.id);
    setConstraints(nextConstraints);
    setMessage(`${option.label} is prioritized. ${nextPlan.explanation}`);
  }

  function markComplete() {
    const unmetPrerequisite = selectedTopic.prerequisites
      .map((id) => byId.get(id))
      .find((topic) => topic?.status !== "completed");

    if (unmetPrerequisite) {
      setMessage(`Complete ${unmetPrerequisite.shortTitle} first. StudyForge keeps ${selectedTopic.shortTitle} behind its prerequisite path.`);
      return;
    }
    const nextPlan = updateTopic(selectedTopic.id, { status: "completed" });
    setMessage(`${selectedTopic.shortTitle} is complete. The remaining schedule now covers ${nextPlan.coverage}% of weighted course value.`);
  }

  function flagStruggle() {
    const beforeCoverage = plan.coverage;
    const nextPlan = updateTopic(selectedTopic.id, { status: "struggling" });
    setMessage(`${selectedTopic.shortTitle} gets an additional practice hour. Coverage changes from ${beforeCoverage}% to ${nextPlan.coverage}% to preserve the prerequisite path.`);
  }

  function adjustEstimate(delta: number) {
    const estimatedHours = Math.max(1, Math.min(4, selectedTopic.estimatedHours + delta));
    const nextPlan = updateTopic(selectedTopic.id, { estimatedHours });
    setMessage(`${selectedTopic.shortTitle} is estimated at ${estimatedHours}h. ${nextPlan.explanation}`);
  }

  function resetDemo() {
    setTopics(initialTopics);
    setSelectedTopicId("bfs");
    setConstraints({ days: 3, hoursPerDay: 2, prioritizedTopicIds: focusOptions[0].topicIds });
    setFocus("balanced");
    setMessage("Demo reset to the DSA final scenario.");
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-slate-950">
      <header className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 font-bold text-white">S</div>
            <div>
              <p className="text-lg font-semibold tracking-tight">StudyForge</p>
              <p className="text-xs text-slate-500">Adaptive study operating system</p>
            </div>
          </div>
          <div className="hidden items-center gap-5 text-sm text-slate-600 md:flex">
            <span>DSA final</span>
            <span className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-700">{constraints.days} days left</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-7 md:px-10 lg:grid-cols-[1.15fr_1.6fr_1.15fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:row-span-2">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-indigo-600">LEARNING MAP</p>
              <h1 className="mt-1 text-xl font-semibold">Data Structures & Algorithms</h1>
            </div>
            <span className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium">{topics.length} topics</span>
          </div>
          <p className="mb-5 text-sm leading-6 text-slate-600">Every scheduled topic includes its required prerequisite path.</p>

          <div className="space-y-2">
            {topics.map((topic) => {
              const prerequisiteNames = topic.prerequisites.map((id) => byId.get(id)?.shortTitle).filter(Boolean);
              const isScheduled = scheduledIds.has(topic.id);
              return (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                    selectedTopic.id === topic.id
                      ? "border-indigo-300 bg-indigo-50"
                      : isScheduled
                        ? "border-sky-200 bg-sky-50/50 hover:border-sky-300"
                        : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span>
                    <span className="block text-sm font-semibold">{topic.shortTitle}</span>
                    <span className="block pt-0.5 text-xs text-slate-500">
                      {prerequisiteNames.length ? `Needs ${prerequisiteNames.join(", ")}` : "Foundation"} · {topic.estimatedHours}h
                    </span>
                  </span>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusStyle[topic.status]}`}>
                    {topicStatusLabel(topic.status)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="text-xs font-bold tracking-wide text-slate-500">EDIT {selectedTopic.shortTitle.toUpperCase()} ESTIMATE</p>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
              <button onClick={() => adjustEstimate(-1)} className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-lg font-medium" aria-label="Reduce estimated hours">−</button>
              <span className="text-sm font-semibold">{selectedTopic.estimatedHours} hour{selectedTopic.estimatedHours === 1 ? "" : "s"}</span>
              <button onClick={() => adjustEstimate(1)} className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-lg font-medium" aria-label="Increase estimated hours">+</button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-sm font-medium text-indigo-300">{activeBlock ? `${activeBlock.day.toUpperCase()} · ${activeBlock.hour}` : selectedTopic.status === "completed" ? "COMPLETE" : "OUTSIDE CURRENT PLAN"}</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{selectedTopic.title}</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
            {selectedTopic.source}. {scheduledIds.has(selectedTopic.id)
              ? "Your plan keeps this topic in scope because of its exam value and prerequisite impact."
              : "This topic is currently outside the time budget, so it will not break a prerequisite chain."}
          </p>
          <div className="mt-6 rounded-xl bg-white/10 p-4">
            <p className="text-xs font-semibold tracking-wide text-indigo-200">CONTEXTUAL STUDY ASSISTANT</p>
            <p className="mt-2 text-sm leading-6 text-slate-100">“We’ll work from the relevant source, check the prerequisite you need, then use a short recall check before the next block.”</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900">Explain visually</button>
              <button className="rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold">Quiz me</button>
              <button className="rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold">20-minute version</button>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={markComplete} disabled={selectedTopic.status === "completed"} className="rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950 disabled:cursor-not-allowed disabled:opacity-50">Mark complete</button>
            <button onClick={flagStruggle} disabled={selectedTopic.status === "completed"} className="rounded-lg border border-rose-300/60 px-4 py-2.5 text-sm font-semibold text-rose-100 disabled:cursor-not-allowed disabled:opacity-50">I need more time</button>
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-indigo-600">PLAN CONTROLS</p>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between"><span className="text-sm text-slate-600">Days available</span><div className="flex items-center gap-2"><button onClick={() => changeAvailability("days", -1)} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200">−</button><strong className="w-5 text-center">{constraints.days}</strong><button onClick={() => changeAvailability("days", 1)} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200">+</button></div></div>
            <div className="flex items-center justify-between"><span className="text-sm text-slate-600">Hours / day</span><div className="flex items-center gap-2"><button onClick={() => changeAvailability("hoursPerDay", -1)} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200">−</button><strong className="w-5 text-center">{constraints.hoursPerDay}</strong><button onClick={() => changeAvailability("hoursPerDay", 1)} className="grid h-7 w-7 place-items-center rounded-md border border-slate-200">+</button></div></div>
          </div>
          <p className="mt-5 text-xs font-bold tracking-wide text-slate-500">FOCUS</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {focusOptions.map((option) => (
              <button key={option.id} onClick={() => chooseFocus(option.id)} aria-pressed={focus === option.id} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${focus === option.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600"}`}>{option.label}</button>
            ))}
          </div>
          <button onClick={resetDemo} className="mt-5 text-xs font-semibold text-indigo-700 underline underline-offset-4">Reset demo</button>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-indigo-600">PLAN TIMELINE</p>
              <h2 className="mt-1 text-xl font-semibold">A prerequisite-safe {plan.capacityHours}-hour plan</h2>
            </div>
            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">{plan.coverage}% weighted coverage</span>
          </div>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            {Array.from({ length: constraints.days }, (_, dayIndex) => {
              const dayBlocks = plan.blocks.filter((block) => block.dayIndex === dayIndex);
              const day = dayIndex === 0 ? "Today" : dayIndex === 1 ? "Tomorrow" : `Day ${dayIndex + 1}`;
              return (
                <div key={day}>
                  <p className="mb-2 text-xs font-bold tracking-wide text-slate-500">{day.toUpperCase()}</p>
                  <div className="space-y-2">
                    {dayBlocks.map((block) => (
                      <button key={block.id} onClick={() => setSelectedTopicId(block.topicId)} className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-indigo-300">
                        <span className="text-xs text-slate-500">{block.hour} · {block.kind}</span>
                        <strong className="mt-1 block text-sm leading-5">{block.label}</strong>
                      </button>
                    ))}
                    {!dayBlocks.length && <p className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-500">Reserved for catch-up or review.</p>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-5 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900" role="status">{message}</p>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-start-3 lg:row-start-3">
          <p className="text-sm font-medium text-indigo-600">PROGRESS</p>
          <div className="mt-3 flex items-end justify-between"><h2 className="text-3xl font-semibold">{plan.coverage}%</h2><span className="text-sm text-slate-500">weighted coverage</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${plan.coverage}%` }} /></div>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-3"><strong className="block text-lg">{completedCount}/{topics.length}</strong><span className="text-slate-500">topics done</span></div><div className="rounded-xl bg-slate-50 p-3"><strong className="block text-lg">{plan.scheduledHours}h</strong><span className="text-slate-500">of {plan.capacityHours}h planned</span></div></div>
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900">
            {plan.riskTopicId ? <><strong>Trade-off:</strong> {byId.get(plan.riskTopicId)?.shortTitle} is currently deferred to protect higher-value prerequisite paths.</> : <><strong>Buffer:</strong> {plan.bufferHours}h remains available for recovery or revision.</>}
          </div>
        </aside>
      </div>
    </main>
  );
}
