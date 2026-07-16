"use client";

import { useMemo, useState } from "react";
import { initialPlan, initialTopics, replanAfterStruggle, type StudyBlock, type Topic } from "@/lib/planner";

const statusStyle = {
  completed: "bg-emerald-100 text-emerald-800",
  in_progress: "bg-amber-100 text-amber-800",
  not_started: "bg-slate-100 text-slate-600",
  struggling: "bg-rose-100 text-rose-800",
};

export default function Home() {
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [plan, setPlan] = useState<StudyBlock[]>(initialPlan);
  const [selectedTopic, setSelectedTopic] = useState("bfs");
  const [replanned, setReplanned] = useState(false);
  const [message, setMessage] = useState("");

  const selected = topics.find((topic) => topic.id === selectedTopic) ?? topics[0];
  const completed = topics.filter((topic) => topic.status === "completed").length;
  const coverage = replanned ? 86 : 92;

  const groupedPlan = useMemo(() => {
    return plan.reduce<Record<string, StudyBlock[]>>((groups, block) => {
      groups[block.day] ??= [];
      groups[block.day].push(block);
      return groups;
    }, {});
  }, [plan]);

  function markComplete() {
    setTopics((current) => current.map((topic) => topic.id === selectedTopic ? { ...topic, status: "completed" } : topic));
    setMessage(`${selected.shortTitle} is marked complete. The rest of the plan is still on track.`);
  }

  function struggle() {
    setTopics((current) => current.map((topic) => topic.id === "bfs" ? { ...topic, status: "struggling" } : topic));
    setPlan(replanAfterStruggle(plan));
    setReplanned(true);
    setSelectedTopic("bfs");
    setMessage("Plan updated: BFS received one extra practice hour; Dijkstra moved to Friday; weighted coverage is now 86%.");
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-slate-950">
      <header className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 font-bold text-white">S</div>
            <div><p className="text-lg font-semibold tracking-tight">StudyForge</p><p className="text-xs text-slate-500">Adaptive study operating system</p></div>
          </div>
          <div className="hidden items-center gap-5 text-sm text-slate-600 md:flex"><span>DSA final</span><span className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-700">3 days left</span></div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-7 md:px-10 lg:grid-cols-[1.15fr_1.6fr_1.15fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:row-span-2">
          <div className="mb-5 flex items-start justify-between"><div><p className="text-sm font-medium text-indigo-600">LEARNING MAP</p><h1 className="mt-1 text-xl font-semibold">Data Structures & Algorithms</h1></div><button className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium">Edit map</button></div>
          <p className="mb-5 text-sm leading-6 text-slate-600">Your plan preserves the prerequisite path to shortest paths.</p>
          <div className="space-y-2">
            {topics.map((topic) => (
              <button key={topic.id} onClick={() => setSelectedTopic(topic.id)} className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${selectedTopic === topic.id ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-slate-300"}`}>
                <span><span className="block text-sm font-semibold">{topic.shortTitle}</span><span className="block pt-0.5 text-xs text-slate-500">{topic.prerequisites.length ? `Needs ${topic.prerequisites.join(", ")}` : "Foundation"}</span></span>
                <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusStyle[topic.status]}`}>{topic.status.replace("_", " ")}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
          <p className="text-sm font-medium text-indigo-300">TODAY · 5:00–6:00 PM</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{selected.title}</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">{selected.source}. Focus on the queue invariant, then explain why BFS produces shortest paths in an unweighted graph.</p>
          <div className="mt-6 rounded-xl bg-white/10 p-4"><p className="text-xs font-semibold tracking-wide text-indigo-200">STUDY ASSISTANT</p><p className="mt-2 text-sm leading-6 text-slate-100">“I know this is your first pass. We’ll use a small visual example, then a three-question check before moving on.”</p><div className="mt-4 flex flex-wrap gap-2"><button className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900">Explain visually</button><button className="rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold">Quiz me</button><button className="rounded-lg border border-white/25 px-3 py-2 text-xs font-semibold">20-minute version</button></div></div>
          <div className="mt-5 flex flex-wrap gap-3"><button onClick={markComplete} className="rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-emerald-950">Mark complete</button><button onClick={struggle} className="rounded-lg border border-rose-300/60 px-4 py-2.5 text-sm font-semibold text-rose-100">I’m struggling</button></div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-indigo-600">PROGRESS</p><div className="mt-3 flex items-end justify-between"><h2 className="text-3xl font-semibold">{coverage}%</h2><span className="text-sm text-slate-500">weighted coverage</span></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${coverage}%` }} /></div>
          <div className="mt-6 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-3"><strong className="block text-lg">{completed}/6</strong><span className="text-slate-500">topics done</span></div><div className="rounded-xl bg-slate-50 p-3"><strong className="block text-lg">6h</strong><span className="text-slate-500">planned time</span></div></div>
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900"><strong>Risk watch:</strong> BFS unlocks Dijkstra. Keep its practice block before Friday.</div>
        </aside>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-medium text-indigo-600">PLAN TIMELINE</p><h2 className="mt-1 text-xl font-semibold">A prerequisite-safe 6-hour plan</h2></div>{replanned && <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700">Replanned after BFS struggle</span>}</div>
          <div className="mt-5 grid gap-5 md:grid-cols-3">{Object.entries(groupedPlan).map(([day, blocks]) => <div key={day}><p className="mb-2 text-xs font-bold tracking-wide text-slate-500">{day.toUpperCase()}</p><div className="space-y-2">{blocks.map((block) => <button key={block.id} onClick={() => setSelectedTopic(block.topicId)} className="w-full rounded-xl border border-slate-200 p-3 text-left hover:border-indigo-300"><span className="text-xs text-slate-500">{block.hour} · {block.kind}</span><strong className="mt-1 block text-sm leading-5">{block.label}</strong></button>)}</div></div>)}</div>
          {message && <p className="mt-5 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900" role="status">{message}</p>}
        </section>
      </div>
    </main>
  );
}
