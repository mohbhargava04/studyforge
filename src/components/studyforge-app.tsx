"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  buildStudyPlan,
  dependentTopicIds,
  validateCourseGraph,
  type PlanResult,
  type StudyBlock,
  type Topic,
  type TopicStatus,
} from "@/lib/planner";
import {
  WORKSPACE_STORAGE_KEY,
  courseDeadlineLabel,
  createCourseDraft,
  createDemoWorkspace,
  formulaSheetForTopic,
  localCoachReply,
  quizForTopic,
  readWorkspace,
  sourceKindLabel,
  statusLabel,
  visualExplanationForTopic,
  type ChatMessage,
  type Course,
  type CourseSource,
  type NotebookItem,
  type NotebookItemKind,
  type SourceKind,
  type StudyQuiz,
  type Workspace,
} from "@/lib/studyforge";

type ViewId = "today" | "plan" | "map" | "notebook" | "progress" | "portfolio";
type ToolMode = "visual" | "formula" | "rescue" | null;

type ReplanState = {
  title: string;
  reason: string;
  before: PlanResult;
  after: PlanResult;
  beforeTopics: Topic[];
};

type QuizState = {
  topic: Topic;
  quiz: StudyQuiz;
  answers: Array<number | null>;
  submitted: boolean;
};

type ScheduleProposal = {
  title: string;
  description: string;
  apply: () => void;
};

const navItems: Array<{ id: ViewId; label: string; icon: IconName }> = [
  { id: "today", label: "Today", icon: "spark" },
  { id: "plan", label: "Plan", icon: "calendar" },
  { id: "map", label: "Learning map", icon: "map" },
  { id: "notebook", label: "Notebook", icon: "book" },
  { id: "progress", label: "Progress", icon: "chart" },
  { id: "portfolio", label: "Portfolio", icon: "layers" },
];

const statusClasses: Record<TopicStatus, string> = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  in_progress: "border-amber-200 bg-amber-50 text-amber-800",
  not_started: "border-slate-200 bg-slate-50 text-slate-600",
  struggling: "border-rose-200 bg-rose-50 text-rose-800",
};

const courseAccent: Record<Course["color"], { soft: string; strong: string; ring: string; dot: string }> = {
  violet: { soft: "bg-violet-50 text-violet-800", strong: "bg-violet-600", ring: "ring-violet-200", dot: "bg-violet-500" },
  cyan: { soft: "bg-cyan-50 text-cyan-800", strong: "bg-cyan-600", ring: "ring-cyan-200", dot: "bg-cyan-500" },
  amber: { soft: "bg-amber-50 text-amber-800", strong: "bg-amber-500", ring: "ring-amber-200", dot: "bg-amber-500" },
  rose: { soft: "bg-rose-50 text-rose-800", strong: "bg-rose-600", ring: "ring-rose-200", dot: "bg-rose-500" },
};

type IconName =
  | "spark"
  | "calendar"
  | "map"
  | "book"
  | "chart"
  | "layers"
  | "plus"
  | "chevron"
  | "clock"
  | "target"
  | "play"
  | "check"
  | "alert"
  | "message"
  | "volume"
  | "wand"
  | "brain"
  | "arrow"
  | "upload"
  | "file"
  | "youtube"
  | "more"
  | "close"
  | "edit"
  | "copy"
  | "reset"
  | "search"
  | "filter"
  | "lock"
  | "bolt";

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  const props = { className: `h-4 w-4 ${className}`, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  const paths: Record<IconName, React.ReactNode> = {
    spark: <><path d="m12 2 1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7L12 2Z" /><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    map: <><path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" /><path d="M9 3v15M15 6v15" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Z" /><path d="M4 5.5v16" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m7 16 4-5 3 3 5-7" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 16 9 5 9-5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M12 2v2M22 12h-2M12 22v-2M2 12h2" /></>,
    play: <path d="m8 5 11 7-11 7V5Z" fill="currentColor" stroke="none" />,
    check: <path d="m5 12 4 4L19 6" />,
    alert: <><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v4M12 17h.01" /></>,
    message: <><path d="M21 11.5a8.4 8.4 0 0 1-9 8.3 9.8 9.8 0 0 1-4.2-1L3 20l1.3-4A8.2 8.2 0 0 1 3 11.5 8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5Z" /></>,
    volume: <><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" /></>,
    wand: <><path d="m15 4 5 5M13.5 5.5l5 5M4 20l10-10" /><path d="m4 14 1.4.4L6 16l.6-1.6L8 14l-1.4-.4L6 12l-.6 1.6L4 14Z" /></>,
    brain: <><path d="M9.5 4.5A3.5 3.5 0 0 0 4 7.4 3.5 3.5 0 0 0 4.8 14 3.5 3.5 0 0 0 9.5 19.5" /><path d="M14.5 4.5A3.5 3.5 0 0 1 20 7.4a3.5 3.5 0 0 1-.8 6.6 3.5 3.5 0 0 1-4.7 5.5" /><path d="M12 3v18M8 8h4M8 13h4M12 10h4M12 16h4" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
    youtube: <><rect x="3" y="6" width="18" height="12" rx="3" /><path d="m10 9 5 3-5 3V9Z" fill="currentColor" stroke="none" /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z" /></>,
    copy: <><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    reset: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>,
    search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2" /></>,
    filter: <path d="M4 5h16M7 12h10M10 19h4" />,
    lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    bolt: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />,
  };
  return <svg {...props}>{paths[name]}</svg>;
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

function compactHours(value: number) {
  return `${value}h`;
}

function topicMastery(topic: Topic) {
  if (topic.status === "completed") return 100;
  if (topic.status === "struggling") return Math.min(topic.confidence ?? 20, 35);
  return topic.confidence ?? (topic.status === "in_progress" ? 50 : 20);
}

function kindLabel(kind: NotebookItemKind) {
  return kind === "formula" ? "Formula" : kind === "visual" ? "Visual" : kind === "quiz" ? "Quiz" : kind === "chat" ? "Coach note" : "Note";
}

function sourceIcon(kind: SourceKind): IconName {
  return kind === "youtube" ? "youtube" : kind === "pdf" ? "file" : "book";
}

function dayColumnName(index: number) {
  return index === 0 ? "Today" : index === 1 ? "Tomorrow" : `Day ${index + 1}`;
}

function clamp(number: number, low: number, high: number) {
  return Math.max(low, Math.min(high, number));
}

function getMovedBlocks(before: PlanResult, after: PlanResult, topics: Topic[]) {
  const beforeById = new Map(before.blocks.map((block) => [block.id, block]));
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  return after.blocks
    .filter((block) => {
      const previous = beforeById.get(block.id);
      return previous && (previous.dayIndex !== block.dayIndex || previous.hour !== block.hour);
    })
    .slice(0, 3)
    .map((block) => {
      const previous = beforeById.get(block.id);
      return `${block.label || byId.get(block.topicId)?.shortTitle}: ${previous?.day} ${previous?.hour} → ${block.day} ${block.hour}`;
    });
}

function sanitizeGeneratedTopics(value: unknown, sourceLabel: string): Topic[] | null {
  if (!Array.isArray(value) || value.length < 3) return null;
  const records = value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object").slice(0, 8);
  if (records.length < 3) return null;
  const titles = records.map((item, index) => {
    const candidate = typeof item.title === "string" ? item.title.trim().slice(0, 80) : "";
    return candidate || `Topic ${index + 1}`;
  });
  const idForTitle = new Map<string, string>();
  const usedIds = new Set<string>();
  titles.forEach((title, index) => {
    const stem = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `topic-${index + 1}`;
    let id = stem;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${stem}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    idForTitle.set(title.toLowerCase(), id);
  });
  const topics = records.map((item, index) => {
    const rawPrerequisites = Array.isArray(item.prerequisites) ? item.prerequisites : [];
    const prerequisiteIds = rawPrerequisites
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => idForTitle.get(entry.trim().toLowerCase()))
      .filter((entry): entry is string => Boolean(entry));
    const title = titles[index];
    const shortTitle = typeof item.shortTitle === "string" && item.shortTitle.trim() ? item.shortTitle.trim().slice(0, 28) : title.split(/\s+/).slice(0, 2).join(" ");
    return {
      id: idForTitle.get(title.toLowerCase()) ?? `topic-${index + 1}`,
      title,
      shortTitle,
      estimatedHours: clamp(typeof item.estimatedHours === "number" ? Math.round(item.estimatedHours) : 2, 1, 4),
      importance: clamp(typeof item.importance === "number" ? Math.round(item.importance) : 4, 1, 5),
      prerequisites: prerequisiteIds,
      status: index === 0 ? "in_progress" as const : "not_started" as const,
      source: sourceLabel,
      description: typeof item.description === "string" ? item.description.trim().slice(0, 320) : "An editable topic generated from your study material.",
      confidence: index === 0 ? 45 : 20,
    };
  });
  return validateCourseGraph(topics) ? null : topics;
}

export function StudyForgeApp() {
  const [workspace, setWorkspace] = useState<Workspace>(() => createDemoWorkspace());
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<ViewId>("today");
  const [selectedTopicId, setSelectedTopicId] = useState("bfs");
  const [courseMenuOpen, setCourseMenuOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editorTopicId, setEditorTopicId] = useState<string | null>(null);
  const [replan, setReplan] = useState<ReplanState | null>(null);
  const [undoCourse, setUndoCourse] = useState<{ course: Course; label: string } | null>(null);
  const [toast, setToast] = useState("Your workspace is ready locally. Changes stay in this browser.");
  const [toolMode, setToolMode] = useState<ToolMode>(null);
  const [quizState, setQuizState] = useState<QuizState | null>(null);
  const [coachInput, setCoachInput] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [scheduleProposal, setScheduleProposal] = useState<ScheduleProposal | null>(null);
  const [noteSearch, setNoteSearch] = useState("");
  const [noteKind, setNoteKind] = useState<NotebookItemKind | "all">("all");
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const [sourcePreview, setSourcePreview] = useState<CourseSource | null>(null);
  const [quickSearch, setQuickSearch] = useState("");
  const [planMode, setPlanMode] = useState<"timeline" | "agenda">("timeline");

  useEffect(() => {
    const restore = window.setTimeout(() => {
      const stored = readWorkspace(window.localStorage.getItem(WORKSPACE_STORAGE_KEY));
      if (stored) {
        setWorkspace(stored);
        const active = stored.courses.find((course) => course.id === stored.activeCourseId) ?? stored.courses[0];
        setSelectedTopicId(active.topics.find((topic) => topic.status !== "completed")?.id ?? active.topics[0]?.id ?? "");
        setToast("Restored your local StudyForge workspace.");
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(restore);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
  }, [workspace, hydrated]);

  const activeCourse = workspace.courses.find((course) => course.id === workspace.activeCourseId) ?? workspace.courses[0];
  const plan = useMemo(() => buildStudyPlan(activeCourse.topics, activeCourse.constraints), [activeCourse]);
  const topicsById = useMemo(() => new Map(activeCourse.topics.map((topic) => [topic.id, topic])), [activeCourse.topics]);
  const selectedTopic = topicsById.get(selectedTopicId) ?? activeCourse.topics.find((topic) => topic.status !== "completed") ?? activeCourse.topics[0];
  const selectedBlock = selectedTopic ? plan.blocks.find((block) => block.topicId === selectedTopic.id) : undefined;
  const currentBlock = plan.blocks.find((block) => topicsById.get(block.topicId)?.status !== "completed") ?? plan.blocks[0];
  const mastery = Math.round(activeCourse.topics.reduce((sum, topic) => sum + topicMastery(topic), 0) / Math.max(1, activeCourse.topics.length));
  const editorTopic = editorTopicId ? topicsById.get(editorTopicId) : undefined;
  const focusTopics = activeCourse.topics.filter((topic) => topic.status !== "completed");

  const updateActiveCourse = (updater: (course: Course) => Course) => {
    setWorkspace((previous) => ({
      ...previous,
      courses: previous.courses.map((course) => (course.id === activeCourse.id ? updater(course) : course)),
    }));
  };

  const selectCourse = (courseId: string) => {
    const next = workspace.courses.find((course) => course.id === courseId);
    if (!next) return;
    setWorkspace((previous) => ({ ...previous, activeCourseId: courseId }));
    setSelectedTopicId(next.topics.find((topic) => topic.status !== "completed")?.id ?? next.topics[0]?.id ?? "");
    setCourseMenuOpen(false);
    setView("today");
    setToast(`${next.shortName} is now in focus.`);
  };

  const commitReplan = (nextCourse: Course, title: string, reason: string) => {
    const beforeCourse = activeCourse;
    const before = plan;
    const after = buildStudyPlan(nextCourse.topics, nextCourse.constraints);
    setWorkspace((previous) => ({
      ...previous,
      courses: previous.courses.map((course) => (course.id === activeCourse.id ? nextCourse : course)),
    }));
    setUndoCourse({ course: beforeCourse, label: title });
    setReplan({ title, reason, before, after, beforeTopics: beforeCourse.topics });
    setToast(`${title} — your plan was recalculated without breaking prerequisites.`);
  };

  const updateTopic = (topicId: string, patch: Partial<Topic>, title: string, reason: string) => {
    const nextTopics = activeCourse.topics.map((topic) => (topic.id === topicId ? { ...topic, ...patch } : topic));
    commitReplan({ ...activeCourse, topics: nextTopics }, title, reason);
  };

  const changeConstraint = (key: "days" | "hoursPerDay", delta: number) => {
    const high = key === "days" ? 14 : 6;
    const nextValue = clamp(activeCourse.constraints[key] + delta, 1, high);
    if (nextValue === activeCourse.constraints[key]) return;
    const nextCourse = { ...activeCourse, constraints: { ...activeCourse.constraints, [key]: nextValue } };
    commitReplan(nextCourse, key === "days" ? "Availability updated" : "Daily study time updated", `You now have ${nextCourse.constraints.days * nextCourse.constraints.hoursPerDay} focused hours before the deadline.`);
  };

  const chooseFocus = (kind: "balanced" | "current" | "path" | "quick") => {
    if (!selectedTopic) return;
    let topicIds: string[] = [];
    if (kind === "balanced") topicIds = focusTopics.slice(0, 3).map((topic) => topic.id);
    if (kind === "current") topicIds = [selectedTopic.id];
    if (kind === "path") topicIds = [selectedTopic.id, ...dependentTopicIds(selectedTopic.id, activeCourse.topics)].slice(0, 4);
    if (kind === "quick") topicIds = [...focusTopics].sort((a, b) => a.estimatedHours - b.estimatedHours || b.importance - a.importance).slice(0, 3).map((topic) => topic.id);
    const label = kind === "balanced" ? "Balanced focus" : kind === "current" ? `${selectedTopic.shortTitle} first` : kind === "path" ? "Dependency path prioritized" : "Quick wins prioritized";
    commitReplan({ ...activeCourse, constraints: { ...activeCourse.constraints, prioritizedTopicIds: topicIds } }, label, "Priority changed; StudyForge re-optimized the safe learning path around it.");
  };

  const markComplete = () => {
    if (!selectedTopic || selectedTopic.status === "completed") return;
    const missing = selectedTopic.prerequisites.map((id) => topicsById.get(id)).find((topic) => topic?.status !== "completed");
    if (missing) {
      setToast(`${missing.shortTitle} needs to be complete first. That keeps ${selectedTopic.shortTitle} from becoming an orphaned study block.`);
      return;
    }
    updateTopic(selectedTopic.id, { status: "completed", confidence: 100, lastStudiedAt: new Date().toISOString() }, `${selectedTopic.shortTitle} completed`, "The next blocks were promoted using the prerequisite path you just unlocked.");
  };

  const markStruggling = () => {
    if (!selectedTopic || selectedTopic.status === "completed") return;
    updateTopic(selectedTopic.id, { status: "struggling", confidence: Math.min(topicMastery(selectedTopic), 35), lastStudiedAt: new Date().toISOString() }, `${selectedTopic.shortTitle} needs recovery time`, "One practice hour was protected before downstream topics. Lower-value work may move out to preserve the path.");
  };

  const skipTopic = () => {
    if (!selectedTopic || selectedTopic.status === "completed") return;
    updateTopic(selectedTopic.id, { status: "not_started", confidence: Math.min(topicMastery(selectedTopic), 30) }, `${selectedTopic.shortTitle} was skipped for now`, "The planner moved this unfinished block behind safer, higher-value work. You can bring it back with a priority change.");
  };

  const saveTopic = (draft: Topic) => {
    const nextTopics = activeCourse.topics.map((topic) => (topic.id === draft.id ? draft : topic));
    const error = validateCourseGraph(nextTopics);
    if (error) {
      setToast(`Map change not saved: ${error}`);
      return;
    }
    commitReplan({ ...activeCourse, topics: nextTopics }, `${draft.shortTitle} map node updated`, "The map was revalidated and the schedule was rebuilt from the new dependency structure.");
    setEditorTopicId(null);
  };

  const addNotebookItem = (item: NotebookItem) => {
    updateActiveCourse((course) => ({ ...course, notes: [item, ...course.notes] }));
    setToast(`Saved “${item.title}” to your Course Notebook.`);
  };

  const openTool = (mode: Exclude<ToolMode, null>) => {
    if (!selectedTopic) return;
    setToolMode(mode);
    if (mode === "visual") setToast(`Opened a visual explanation for ${selectedTopic.shortTitle}.`);
    if (mode === "formula") setToast(`Built a compact recall sheet for ${selectedTopic.shortTitle}.`);
    if (mode === "rescue") setToast(`A 20-minute rescue sequence is ready for ${selectedTopic.shortTitle}.`);
  };

  const startQuiz = () => {
    if (!selectedTopic) return;
    setQuizState({ topic: selectedTopic, quiz: quizForTopic(selectedTopic), answers: [null, null, null], submitted: false });
  };

  const readAloud = (text: string) => {
    if (!("speechSynthesis" in window)) {
      setToast("Text-to-speech is not available in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    window.speechSynthesis.speak(utterance);
    setToast("Reading the current explanation aloud.");
  };

  const sendCoachMessage = async (raw: string) => {
    if (!selectedTopic) return;
    const question = raw.trim();
    if (!question || coachLoading) return;
    const userMessage: ChatMessage = { id: `user-${Date.now().toString(36)}`, role: "user", content: question, createdAt: new Date().toISOString(), topicId: selectedTopic.id };
    updateActiveCourse((course) => ({ ...course, chat: [...course.chat, userMessage] }));
    setCoachInput("");
    setCoachLoading(true);

    const lower = question.toLowerCase();
    if (/\b(add|give|need|make).{0,20}(hour|hours|time)\b/.test(lower)) {
      setScheduleProposal({
        title: `Protect one more hour for ${selectedTopic.shortTitle}?`,
        description: "You’ll see the coverage and dependency trade-off before you continue.",
        apply: () => {
          setScheduleProposal(null);
          markStruggling();
        },
      });
    }

    let answer = "";
    let remote = false;
    try {
      const firstSource = activeCourse.sources[0];
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          topic: { title: selectedTopic.title, description: selectedTopic.description, source: selectedTopic.source },
          sourceExcerpt: firstSource?.excerpt,
          remainingMinutes: selectedBlock?.durationMinutes ?? 60,
        }),
      });
      if (response.ok) {
        const body = (await response.json()) as { answer?: string };
        if (body.answer) {
          answer = body.answer;
          remote = true;
        }
      }
    } catch {
      // The deterministic source-aware coach below keeps the study flow usable offline.
    }
    if (!answer) answer = localCoachReply(selectedTopic, question, activeCourse);
    const coachMessage: ChatMessage = {
      id: `coach-${Date.now().toString(36)}`,
      role: "assistant",
      content: answer,
      createdAt: new Date().toISOString(),
      topicId: selectedTopic.id,
      sourceLabel: selectedTopic.source,
    };
    updateActiveCourse((course) => ({ ...course, chat: [...course.chat, coachMessage] }));
    setCoachLoading(false);
    setToast(remote ? "Coach answer grounded in your current source context." : "Local coach answer ready — add OPENAI_API_KEY later for live source-grounded AI.");
  };

  const restoreDemo = () => {
    const demo = createDemoWorkspace();
    setWorkspace(demo);
    setSelectedTopicId("bfs");
    setView("today");
    setToast("The DSA demo workspace is back in a clean state.");
  };

  const createCourse = (course: Course) => {
    setWorkspace((previous) => ({ ...previous, activeCourseId: course.id, courses: [...previous.courses, course] }));
    setSelectedTopicId(course.topics[0]?.id ?? "");
    setWizardOpen(false);
    setView("map");
    setToast(`${course.shortName} is ready. Review the draft learning map before you study it.`);
  };

  const undoLastChange = () => {
    if (!undoCourse) return;
    setWorkspace((previous) => ({ ...previous, courses: previous.courses.map((course) => (course.id === undoCourse.course.id ? undoCourse.course : course)) }));
    setToast(`Undid: ${undoCourse.label}.`);
    setUndoCourse(null);
    setReplan(null);
  };

  const quickMatches = quickSearch.trim()
    ? activeCourse.topics.filter((topic) => `${topic.title} ${topic.description ?? ""}`.toLowerCase().includes(quickSearch.toLowerCase())).slice(0, 5)
    : [];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f6f7fb] text-slate-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-violet-300/20 blur-3xl" />
        <div className="absolute -right-24 top-20 h-[28rem] w-[28rem] rounded-full bg-cyan-300/15 blur-3xl" />
        <div className="absolute bottom-[-14rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-amber-200/20 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex h-[4.6rem] max-w-[1600px] items-center gap-3 px-4 sm:px-6">
          <button onClick={() => setView("today")} className="flex shrink-0 items-center gap-2.5 text-left" aria-label="Open StudyForge Today workspace">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-950 text-white shadow-lg shadow-slate-950/20"><Icon name="spark" className="h-5 w-5" /></span>
            <span className="hidden leading-tight sm:block"><span className="block text-[15px] font800 tracking-[-0.03em]">StudyForge</span><span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Study OS</span></span>
          </button>

          <div className="relative hidden min-w-0 flex-1 max-w-xl md:block">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={quickSearch} onChange={(event) => setQuickSearch(event.target.value)} placeholder="Jump to a topic or concept…" className="h-10 w-full rounded-xl border border-slate-200 bg-white/85 pl-10 pr-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
            {quickMatches.length > 0 && <div className="absolute left-0 right-0 top-12 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
              {quickMatches.map((topic) => <button key={topic.id} onClick={() => { setSelectedTopicId(topic.id); setView("today"); setQuickSearch(""); }} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-violet-50"><span><span className="block text-sm font-semibold">{topic.shortTitle}</span><span className="block text-xs text-slate-500">{topic.source}</span></span><Icon name="arrow" className="text-violet-500" /></button>)}
            </div>}
          </div>

          <div className="relative ml-auto">
            <button onClick={() => setCourseMenuOpen((open) => !open)} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm transition hover:border-violet-300" aria-expanded={courseMenuOpen}>
              <span className={`grid h-7 w-7 place-items-center rounded-lg text-[10px] font-bold ${courseAccent[activeCourse.color].soft}`}>{initials(activeCourse.shortName)}</span>
              <span className="hidden text-left leading-tight lg:block"><span className="block max-w-32 truncate text-xs font-bold">{activeCourse.shortName}</span><span className="block text-[10px] text-slate-500">{courseDeadlineLabel(activeCourse.deadline)}</span></span>
              <Icon name="chevron" className={`text-slate-500 transition ${courseMenuOpen ? "rotate-90" : ""}`} />
            </button>
            {courseMenuOpen && <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/15">
              <p className="px-2.5 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Your courses</p>
              {workspace.courses.map((course) => <button key={course.id} onClick={() => selectCourse(course.id)} className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition ${course.id === activeCourse.id ? "bg-violet-50" : "hover:bg-slate-50"}`}><span className={`h-2.5 w-2.5 rounded-full ${courseAccent[course.color].dot}`} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{course.shortName}</span><span className="block text-[11px] text-slate-500">{courseDeadlineLabel(course.deadline)} · {course.constraints.days * course.constraints.hoursPerDay}h protected</span></span>{course.id === activeCourse.id && <Icon name="check" className="text-violet-600" />}</button>)}
              <button onClick={() => { setCourseMenuOpen(false); setWizardOpen(true); }} className="mt-1 flex w-full items-center gap-2 rounded-xl border border-dashed border-violet-300 px-3 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50"><Icon name="plus" /> Add a course</button>
            </div>}
          </div>

          <div className="hidden items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-2.5 py-2 text-xs font-semibold text-emerald-800 xl:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Local-first</div>
        </div>
      </header>

      <div className="relative mx-auto flex max-w-[1600px] gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <aside className="sticky top-[5.85rem] hidden h-[calc(100vh-7rem)] w-60 shrink-0 flex-col rounded-3xl border border-white/80 bg-white/75 p-3 shadow-[0_20px_55px_-35px_rgba(30,41,59,0.45)] backdrop-blur-xl lg:flex">
          <div className="mb-4 rounded-2xl bg-slate-950 p-4 text-white shadow-lg shadow-slate-950/20">
            <div className="flex items-start justify-between gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10"><Icon name="target" /></span><span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide">{courseDeadlineLabel(activeCourse.deadline)}</span></div>
            <p className="mt-4 text-xs font-medium text-slate-300">Next milestone</p>
            <p className="mt-1 text-sm font-bold leading-5">{activeCourse.shortName}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-violet-400" style={{ width: `${plan.coverage}%` }} /></div>
            <p className="mt-2 text-[11px] text-slate-300">{plan.coverage}% prerequisite-safe coverage</p>
          </div>

          <nav className="space-y-1" aria-label="StudyForge views">
            {navItems.map((item) => {
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {item.id === "today" && <span className={`ml-auto h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-violet-500"}`} />}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto space-y-2 border-t border-slate-100 pt-4">
            <button onClick={() => setWizardOpen(true)} className="flex w-full items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-bold text-violet-800 transition hover:bg-violet-100"><Icon name="plus" /> New course</button>
            <button onClick={restoreDemo} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"><Icon name="reset" /> Reset demo data</button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 pb-24 lg:pb-6">
          {view === "today" && selectedTopic && <TodayView course={activeCourse} topic={selectedTopic} currentBlock={currentBlock} selectedBlock={selectedBlock} plan={plan} mastery={mastery} speechRate={speechRate} setSpeechRate={setSpeechRate} toolMode={toolMode} setToolMode={setToolMode} onComplete={markComplete} onStruggle={markStruggling} onSkip={skipTopic} onQuiz={startQuiz} onOpenTool={openTool} onReadAloud={readAloud} onAddNote={addNotebookItem} chat={activeCourse.chat} coachInput={coachInput} setCoachInput={setCoachInput} onSendCoach={sendCoachMessage} coachLoading={coachLoading} scheduleProposal={scheduleProposal} onDismissProposal={() => setScheduleProposal(null)} />}
          {view === "plan" && selectedTopic && <PlanView course={activeCourse} topic={selectedTopic} plan={plan} planMode={planMode} setPlanMode={setPlanMode} onSelectTopic={(id) => { setSelectedTopicId(id); setView("today"); }} onChangeConstraint={changeConstraint} onChooseFocus={chooseFocus} />}
          {view === "map" && selectedTopic && <LearningMapView course={activeCourse} plan={plan} selectedTopicId={selectedTopic.id} onSelectTopic={setSelectedTopicId} onEditTopic={setEditorTopicId} onOpenSource={setSourcePreview} />}
          {view === "notebook" && selectedTopic && <NotebookView course={activeCourse} selectedTopic={selectedTopic} search={noteSearch} setSearch={setNoteSearch} kind={noteKind} setKind={setNoteKind} newNoteOpen={newNoteOpen} setNewNoteOpen={setNewNoteOpen} onAddNote={addNotebookItem} onSelectTopic={(id) => { setSelectedTopicId(id); setView("today"); }} setToast={setToast} />}
          {view === "progress" && selectedTopic && <ProgressView course={activeCourse} plan={plan} mastery={mastery} selectedTopic={selectedTopic} onSelectTopic={(id) => { setSelectedTopicId(id); setView("today"); }} />}
          {view === "portfolio" && <PortfolioView courses={workspace.courses} activeCourseId={activeCourse.id} onOpenCourse={selectCourse} onCreateCourse={() => setWizardOpen(true)} />}
        </main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around rounded-2xl border border-white/80 bg-slate-950/95 p-1.5 text-white shadow-2xl shadow-slate-950/30 backdrop-blur-xl lg:hidden" aria-label="Mobile navigation">
        {navItems.slice(0, 5).map((item) => <button key={item.id} onClick={() => setView(item.id)} className={`grid min-h-11 min-w-12 place-items-center rounded-xl px-2 text-[10px] font-semibold transition ${view === item.id ? "bg-white text-slate-950" : "text-slate-300"}`}><Icon name={item.icon} /><span className="mt-0.5">{item.label}</span></button>)}
      </nav>

      <div className="fixed bottom-5 right-5 z-30 max-w-sm" aria-live="polite">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-700 shadow-xl shadow-slate-900/10 backdrop-blur"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-violet-100 text-violet-700"><Icon name="spark" /></span><span className="leading-5">{toast}</span>{undoCourse && <button onClick={undoLastChange} className="shrink-0 rounded-lg bg-slate-950 px-2.5 py-1.5 text-xs font-bold text-white">Undo</button>}</div>
      </div>

      {wizardOpen && <CourseWizard onClose={() => setWizardOpen(false)} onCreate={createCourse} />}
      {editorTopic && <TopicEditor topic={editorTopic} topics={activeCourse.topics} onClose={() => setEditorTopicId(null)} onSave={saveTopic} />}
      {replan && <ReplanModal replan={replan} topics={activeCourse.topics} onClose={() => setReplan(null)} onUndo={undoLastChange} />}
      {quizState && <QuizModal state={quizState} onClose={() => setQuizState(null)} onAnswer={(index, answer) => setQuizState((previous) => previous ? { ...previous, answers: previous.answers.map((value, position) => position === index ? answer : value) } : previous)} onSubmit={() => setQuizState((previous) => previous ? { ...previous, submitted: true } : previous)} onSave={() => {
        const correct = quizState.answers.reduce<number>((count, answer, index) => count + (answer === quizState.quiz.questions[index].answer ? 1 : 0), 0);
        addNotebookItem({ id: `quiz-${quizState.topic.id}-${Date.now().toString(36)}`, title: `${quizState.topic.shortTitle} — ${correct}/${quizState.quiz.questions.length} checkpoint`, body: quizState.quiz.questions.map((question, index) => `${index + 1}. ${question.prompt}\n${quizState.answers[index] === question.answer ? "Correct" : `Review: ${question.explanation}`}`).join("\n\n"), kind: "quiz", topicId: quizState.topic.id, sourceLabel: quizState.topic.source, createdAt: new Date().toISOString() });
        setQuizState(null);
      }} />}
      {sourcePreview && <SourcePreview source={sourcePreview} onClose={() => setSourcePreview(null)} />}
    </div>
  );
}

function TodayView({
  course,
  topic,
  currentBlock,
  selectedBlock,
  plan,
  mastery,
  speechRate,
  setSpeechRate,
  toolMode,
  setToolMode,
  onComplete,
  onStruggle,
  onSkip,
  onQuiz,
  onOpenTool,
  onReadAloud,
  onAddNote,
  chat,
  coachInput,
  setCoachInput,
  onSendCoach,
  coachLoading,
  scheduleProposal,
  onDismissProposal,
}: {
  course: Course;
  topic: Topic;
  currentBlock?: StudyBlock;
  selectedBlock?: StudyBlock;
  plan: PlanResult;
  mastery: number;
  speechRate: number;
  setSpeechRate: (value: number) => void;
  toolMode: ToolMode;
  setToolMode: (value: ToolMode) => void;
  onComplete: () => void;
  onStruggle: () => void;
  onSkip: () => void;
  onQuiz: () => void;
  onOpenTool: (mode: Exclude<ToolMode, null>) => void;
  onReadAloud: (text: string) => void;
  onAddNote: (item: NotebookItem) => void;
  chat: ChatMessage[];
  coachInput: string;
  setCoachInput: (value: string) => void;
  onSendCoach: (value: string) => void;
  coachLoading: boolean;
  scheduleProposal: ScheduleProposal | null;
  onDismissProposal: () => void;
}) {
  const block = selectedBlock ?? currentBlock;
  const remainingTopics = course.topics.filter((candidate) => candidate.status !== "completed").length;
  const dependentNames = dependentTopicIds(topic.id, course.topics).map((id) => course.topics.find((candidate) => candidate.id === id)?.shortTitle).filter(Boolean);
  const lastMessages = chat.slice(-5);
  const toolItem = toolMode === "formula" ? formulaSheetForTopic(topic) : toolMode === "visual" ? visualExplanationForTopic(topic) : null;

  return <div className="animate-[fade-in_0.35s_ease-out] space-y-5">
    <section className="overflow-hidden rounded-[2rem] border border-slate-900 bg-slate-950 text-white shadow-2xl shadow-slate-950/20">
      <div className="relative overflow-hidden p-5 sm:p-7 lg:p-8">
        <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-violet-500/30 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-44 w-44 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative grid gap-7 xl:grid-cols-[minmax(0,1fr)_17rem] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-violet-100">{block ? `${block.day} · ${block.hour}` : "Plan complete"}</span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-slate-300"><Icon name="clock" className="h-3.5 w-3.5" /> {block?.durationMinutes ?? 0} min focus block</span>
              {topic.status === "struggling" && <span className="rounded-full bg-rose-400/15 px-3 py-1.5 text-rose-200">Recovery protected</span>}
            </div>
            <p className="mt-7 text-[11px] font-bold uppercase tracking-[0.18em] text-violet-300">{block ? "Your focus block" : "Course complete"}</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-5xl">{topic.title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-[15px]">{topic.description ?? "Use this block to build a clear, usable mental model before moving on."}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/8 px-2.5 py-2 text-slate-200"><Icon name="file" className="h-3.5 w-3.5 text-violet-300" /> {topic.source}</span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/8 px-2.5 py-2 text-slate-200"><Icon name="bolt" className="h-3.5 w-3.5 text-amber-300" /> {dependentNames.length ? `Unlocks ${dependentNames.join(" · ")}` : "Independent study branch"}</span>
            </div>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <button onClick={onComplete} disabled={topic.status === "completed"} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-bold text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"><Icon name="check" /> {topic.status === "completed" ? "Completed" : "Mark complete"}</button>
              <button onClick={onStruggle} disabled={topic.status === "completed"} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200/40 bg-rose-400/10 px-4 text-sm font-bold text-rose-100 transition hover:bg-rose-400/20 disabled:cursor-not-allowed disabled:opacity-50"><Icon name="alert" /> I need more time</button>
              <button onClick={onSkip} disabled={topic.status === "completed"} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/15 px-4 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">Skip for now <Icon name="arrow" /></button>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
            <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Why now</span><Icon name="target" className="text-violet-300" /></div>
            <p className="mt-3 text-sm font-semibold leading-6 text-white">{block?.rationale ?? "You have completed every block currently in scope."}</p>
            <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-4"><span className="text-xs text-slate-400">Course coverage</span><span className="text-2xl font-semibold tracking-tight">{plan.coverage}%</span></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-cyan-300" style={{ width: `${plan.coverage}%` }} /></div>
          </div>
        </div>
      </div>
    </section>

    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="space-y-5">
        <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_50px_-35px_rgba(30,41,59,0.4)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Study tools</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Choose the kind of help you need</h2></div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">Source-aware · {topic.source}</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ToolButton icon="wand" title="Explain visually" description="A compact mental model" onClick={() => onOpenTool("visual")} />
            <ToolButton icon="brain" title="Quiz me" description="Three recall questions" onClick={onQuiz} />
            <ToolButton icon="clock" title="20-minute rescue" description="Make progress under pressure" onClick={() => onOpenTool("rescue")} />
            <ToolButton icon="file" title="Formula sheet" description="Save a quick reference" onClick={() => onOpenTool("formula")} />
          </div>

          {toolMode && <div className="mt-5 overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-violet-600">{toolMode === "rescue" ? "Rescue block" : toolMode === "visual" ? "Visual explanation" : "Formula sheet"}</p><h3 className="mt-1 text-lg font-semibold">{toolMode === "rescue" ? `${topic.shortTitle} in 20 minutes` : toolItem?.title}</h3></div><button onClick={() => setToolMode(null)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white" aria-label="Close study tool"><Icon name="close" /></button></div>
            {toolMode === "rescue" ? <RescuePlan topic={topic} /> : <>
              {toolMode === "visual" && <ConceptVisual topic={topic} />}
              <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{toolItem?.body}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2"><button onClick={() => toolItem && onReadAloud(toolItem.body)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 text-xs font-bold text-violet-800 hover:bg-violet-50"><Icon name="volume" /> Read aloud</button><button onClick={() => toolItem && onAddNote(toolItem)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white hover:bg-violet-700"><Icon name="book" /> Save to notebook</button><button onClick={() => toolItem && navigator.clipboard?.writeText(toolItem.body)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"><Icon name="copy" /> Copy</button></div>
            </>}
          </div>}
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_50px_-35px_rgba(30,41,59,0.4)] sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Plan signal</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">You have a deliberate trade-off</h2></div><span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">{plan.bufferHours ? `${plan.bufferHours}h recovery buffer` : "Full focus allocation"}</span></div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MiniMetric label="Planned" value={`${plan.scheduledHours}/${plan.capacityHours}h`} detail="time protected" icon="calendar" />
            <MiniMetric label="Remaining" value={String(remainingTopics)} detail="map nodes" icon="map" />
            <MiniMetric label="Mastery" value={`${mastery}%`} detail="self-reported" icon="chart" />
          </div>
          <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-sm leading-6 text-amber-950"><strong>Planner rationale.</strong> {plan.explanation}</p>
        </section>
      </div>

      <aside className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_20px_50px_-35px_rgba(30,41,59,0.45)]">
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-950 to-slate-800 p-5 text-white"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-bold"><span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-400/20 text-violet-200"><Icon name="message" /></span> Forge Coach</span><span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">{coachLoading ? "thinking" : "context on"}</span></div><p className="mt-3 text-sm leading-6 text-slate-300">Ask about {topic.shortTitle}; I’ll keep its source, prerequisite path, and remaining block time in view.</p></div>
        <div className="max-h-[22rem] space-y-3 overflow-y-auto p-4">
          {lastMessages.map((message) => <div key={message.id} className={`rounded-2xl px-3.5 py-3 text-sm leading-6 ${message.role === "user" ? "ml-7 bg-slate-950 text-white" : "mr-3 bg-slate-100 text-slate-700"}`}><p>{message.content}</p>{message.role === "assistant" && message.sourceLabel && <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500"><Icon name="file" className="h-3 w-3" /> {message.sourceLabel}</span>}</div>)}
          {coachLoading && <div className="mr-16 flex items-center gap-2 rounded-2xl bg-slate-100 px-3.5 py-3 text-xs font-semibold text-slate-500"><span className="h-2 w-2 animate-bounce rounded-full bg-violet-400" /><span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:120ms]" /><span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:240ms]" /></div>}
        </div>
        {scheduleProposal && <div className="mx-4 mb-3 rounded-2xl border border-violet-200 bg-violet-50 p-3"><p className="text-xs font-bold text-violet-900">{scheduleProposal.title}</p><p className="mt-1 text-xs leading-5 text-violet-700">{scheduleProposal.description}</p><div className="mt-2 flex gap-2"><button onClick={scheduleProposal.apply} className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-bold text-white">Preview replan</button><button onClick={onDismissProposal} className="rounded-lg px-2 py-1.5 text-xs font-bold text-violet-700">Not now</button></div></div>}
        <div className="border-t border-slate-100 p-4"><div className="flex flex-wrap gap-1.5 pb-2"><button onClick={() => onSendCoach("Explain this from first principles") } className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-violet-300 hover:text-violet-700">First principles</button><button onClick={() => onSendCoach("Give me a 20-minute rescue version") } className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-violet-300 hover:text-violet-700">20-minute version</button><button onClick={() => onSendCoach("What should I remember for the exam?") } className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-violet-300 hover:text-violet-700">Exam cues</button></div><form onSubmit={(event) => { event.preventDefault(); onSendCoach(coachInput); }} className="flex items-center gap-2"><input value={coachInput} onChange={(event) => setCoachInput(event.target.value)} placeholder="Ask Forge Coach…" className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /><button disabled={coachLoading || !coachInput.trim()} className="grid h-11 w-11 place-items-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/20 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send coach message"><Icon name="arrow" /></button></form><div className="mt-2 flex items-center justify-between text-[10px] font-medium text-slate-400"><span>⌘ Enter to send</span><label className="flex items-center gap-1.5">Voice <select value={speechRate} onChange={(event) => setSpeechRate(Number(event.target.value))} className="bg-transparent font-semibold text-slate-500 outline-none"><option value={0.85}>slow</option><option value={1}>normal</option><option value={1.15}>fast</option></select></label></div></div>
      </aside>
    </div>
  </div>;
}

function ToolButton({ icon, title, description, onClick }: { icon: IconName; title: string; description: string; onClick: () => void }) {
  return <button onClick={onClick} className="group min-h-28 rounded-2xl border border-slate-200 bg-white p-3.5 text-left transition duration-200 hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100"><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-700 transition group-hover:bg-violet-600 group-hover:text-white"><Icon name={icon} /></span><span className="mt-3 block text-sm font-bold text-slate-900">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span></button>;
}

function MiniMetric({ label, value, detail, icon }: { label: string; value: string; detail: string; icon: IconName }) {
  return <div className="rounded-2xl bg-slate-50 p-3.5"><span className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">{label}<Icon name={icon} className="text-violet-500" /></span><strong className="mt-2 block text-xl tracking-[-0.03em] text-slate-950">{value}</strong><span className="block text-xs text-slate-500">{detail}</span></div>;
}

function RescuePlan({ topic }: { topic: Topic }) {
  return <div className="mt-4 grid gap-3 sm:grid-cols-3">
    {[{ time: "0–5 min", title: "Anchor", detail: `State ${topic.shortTitle} in your own words before checking notes.` }, { time: "5–15 min", title: "Trace", detail: "Work one tiny example and narrate why each step follows." }, { time: "15–20 min", title: "Retrieve", detail: "Close everything. Answer one exam-style question and rate your confidence." }].map((step, index) => <div key={step.time} className="relative rounded-xl border border-white/90 bg-white/80 p-3.5"><span className="text-[10px] font-bold uppercase tracking-wide text-violet-600">{step.time}</span><p className="mt-1 text-sm font-bold">{index + 1}. {step.title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{step.detail}</p></div>)}
  </div>;
}

function ConceptVisual({ topic }: { topic: Topic }) {
  const labels = topic.id === "bfs" ? ["Start", "Queue", "Layer 1", "Layer 2"] : topic.id === "dp" ? ["State", "Choice", "Transition", "Answer"] : topic.id === "shortest-paths" ? ["Source", "Best route", "Relax", "Distance"] : ["Known", "Rule", "Example", "Recall"];
  return <div className="my-4 overflow-hidden rounded-2xl border border-violet-100 bg-slate-950 p-4"><div className="flex min-w-[31rem] items-center justify-between gap-2">{labels.map((label, index) => <div key={label} className="flex items-center gap-2"><div className={`grid h-14 w-24 place-items-center rounded-xl border text-center text-xs font-bold ${index === 0 ? "border-violet-400 bg-violet-500 text-white" : "border-white/15 bg-white/10 text-slate-100"}`}>{label}</div>{index < labels.length - 1 && <Icon name="arrow" className="text-cyan-300" />}</div>)}</div><p className="mt-3 text-xs leading-5 text-slate-300">Don’t memorize the boxes. Narrate the reason each arrow is valid, then recreate the flow without looking.</p></div>;
}

function PlanView({
  course,
  topic,
  plan,
  planMode,
  setPlanMode,
  onSelectTopic,
  onChangeConstraint,
  onChooseFocus,
}: {
  course: Course;
  topic: Topic;
  plan: PlanResult;
  planMode: "timeline" | "agenda";
  setPlanMode: (mode: "timeline" | "agenda") => void;
  onSelectTopic: (id: string) => void;
  onChangeConstraint: (key: "days" | "hoursPerDay", delta: number) => void;
  onChooseFocus: (kind: "balanced" | "current" | "path" | "quick") => void;
}) {
  const byId = new Map(course.topics.map((item) => [item.id, item]));
  const focusDescription = plan.deferredTopicIds.length
    ? `${plan.deferredTopicIds.map((id) => byId.get(id)?.shortTitle).filter(Boolean).join(", ")} is held outside this pass so the prerequisite path remains honest.`
    : plan.bufferHours ? `${plan.bufferHours}h stays open for recovery or active recall.` : "Every available hour is currently allocated.";
  return <div className="animate-[fade-in_0.35s_ease-out] space-y-5">
    <section className="overflow-hidden rounded-[2rem] border border-slate-900 bg-slate-950 text-white shadow-2xl shadow-slate-950/20">
      <div className="relative p-6 sm:p-8"><div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" /><div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.17em] text-cyan-300">Prerequisite-safe plan</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Make the hours you have count.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Every planned block is selected with its dependency closure, exam value, effort, and your current confidence signal.</p></div><div className="grid grid-cols-3 gap-2 sm:gap-3"><HeroStat label="Capacity" value={`${plan.capacityHours}h`} /><HeroStat label="Coverage" value={`${plan.coverage}%`} /><HeroStat label="Buffer" value={`${plan.bufferHours}h`} /></div></div></div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[19rem_minmax(0,1fr)]">
      <aside className="space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_50px_-35px_rgba(30,41,59,0.4)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Availability</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em]">Shape your real week</h2>
          <div className="mt-5 space-y-3"><Stepper label="Days left" value={course.constraints.days} suffix="days" onMinus={() => onChangeConstraint("days", -1)} onPlus={() => onChangeConstraint("days", 1)} /><Stepper label="Focus per day" value={course.constraints.hoursPerDay} suffix="hours" onMinus={() => onChangeConstraint("hoursPerDay", -1)} onPlus={() => onChangeConstraint("hoursPerDay", 1)} /></div>
          <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-5 text-slate-600">Changing availability never silently breaks a dependency. StudyForge will show the trade-off immediately.</p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_50px_-35px_rgba(30,41,59,0.4)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Focus lens</p><h2 className="mt-1 text-lg font-semibold tracking-[-0.03em]">Optimize for what matters</h2>
          <div className="mt-4 space-y-2"><FocusButton title="Balanced" detail="Value across the map" active={false} onClick={() => onChooseFocus("balanced")} /><FocusButton title={`${topic.shortTitle} first`} detail="Protect the selected node" active={course.constraints.prioritizedTopicIds.includes(topic.id) && course.constraints.prioritizedTopicIds.length === 1} onClick={() => onChooseFocus("current")} /><FocusButton title="Dependency path" detail="Unlock what follows" active={false} onClick={() => onChooseFocus("path")} /><FocusButton title="Quick wins" detail="Build momentum fast" active={false} onClick={() => onChooseFocus("quick")} /></div>
        </section>
      </aside>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_50px_-35px_rgba(30,41,59,0.4)] sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Your timeline</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">{plan.scheduledHours} focused hours, sequenced for learning</h2></div><div className="flex rounded-xl bg-slate-100 p-1"><button onClick={() => setPlanMode("timeline")} aria-pressed={planMode === "timeline"} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${planMode === "timeline" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Timeline</button><button onClick={() => setPlanMode("agenda")} aria-pressed={planMode === "agenda"} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${planMode === "agenda" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Agenda</button></div></div>
        <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-3.5 py-3 text-sm leading-6 text-amber-950"><strong>Trade-off, explained.</strong> {focusDescription}</p>
        {plan.error ? <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900"><Icon name="alert" className="mr-2 inline" />{plan.error}</div> : planMode === "timeline" ? <TimelineGrid plan={plan} days={course.constraints.days} byId={byId} onSelectTopic={onSelectTopic} /> : <AgendaList plan={plan} byId={byId} onSelectTopic={onSelectTopic} />}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><p className="text-xs text-slate-500"><Icon name="lock" className="mr-1 inline h-3.5 w-3.5" /> Learning-map cycles and missing prerequisites pause the plan until fixed.</p><span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">{plan.completedCoverage}% already completed · {plan.scheduledCoverage}% now scheduled</span></div>
      </section>
    </div>
  </div>;
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return <div className="min-w-20 rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2.5"><span className="block text-[10px] font-bold uppercase tracking-[0.13em] text-slate-400">{label}</span><strong className="mt-1 block text-lg tracking-tight">{value}</strong></div>;
}

function Stepper({ label, value, suffix, onMinus, onPlus }: { label: string; value: number; suffix: string; onMinus: () => void; onPlus: () => void }) {
  return <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-3"><span className="text-sm font-semibold text-slate-700">{label}</span><span className="flex items-center gap-2"><button onClick={onMinus} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-lg text-slate-600 hover:border-violet-300" aria-label={`Decrease ${label}`}>−</button><strong className="w-12 text-center text-sm">{value}<span className="ml-0.5 text-[10px] text-slate-400">{suffix === "days" ? "d" : "h"}</span></strong><button onClick={onPlus} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-lg text-slate-600 hover:border-violet-300" aria-label={`Increase ${label}`}>+</button></span></div>;
}

function FocusButton({ title, detail, active, onClick }: { title: string; detail: string; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition ${active ? "border-violet-300 bg-violet-50" : "border-slate-200 hover:border-violet-200 hover:bg-violet-50/40"}`}><span><span className="block text-sm font-bold">{title}</span><span className="block text-[11px] text-slate-500">{detail}</span></span><Icon name="chevron" className={active ? "text-violet-600" : "text-slate-400"} /></button>;
}

function TimelineGrid({ plan, days, byId, onSelectTopic }: { plan: PlanResult; days: number; byId: Map<string, Topic>; onSelectTopic: (id: string) => void }) {
  return <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
    {Array.from({ length: days }, (_, dayIndex) => {
      const blocks = plan.blocks.filter((block) => block.dayIndex === dayIndex);
      return <div key={dayIndex} className="min-h-48 rounded-2xl border border-slate-200 bg-slate-50/65 p-3.5"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{dayColumnName(dayIndex)}</p><span className="text-[11px] font-semibold text-slate-400">{blocks.length} block{blocks.length === 1 ? "" : "s"}</span></div><div className="space-y-2">{blocks.map((block) => <PlanBlock key={block.id} block={block} topic={byId.get(block.topicId)} onClick={() => onSelectTopic(block.topicId)} />)}{blocks.length === 0 && <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-slate-200 bg-white/60 px-3 text-center text-xs leading-5 text-slate-400">Reserved for recovery, rest, or a late plan change.</div>}</div></div>;
    })}
  </div>;
}

function AgendaList({ plan, byId, onSelectTopic }: { plan: PlanResult; byId: Map<string, Topic>; onSelectTopic: (id: string) => void }) {
  return <div className="mt-5 space-y-2">{plan.blocks.length ? plan.blocks.map((block) => <button key={block.id} onClick={() => onSelectTopic(block.topicId)} className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-3.5 text-left transition hover:border-violet-300 hover:bg-violet-50/40"><span className="w-16 text-xs font-bold text-slate-500">{block.day}</span><span className="w-28 text-xs text-slate-400">{block.hour}</span><span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-100 text-violet-700"><Icon name={block.kind === "practice" ? "brain" : block.kind === "review" ? "book" : "spark"} /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{block.label}</strong><span className="block truncate text-xs text-slate-500">{byId.get(block.topicId)?.source}</span></span><Icon name="chevron" className="text-slate-400" /></button>) : <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">No remaining blocks — your completed course is clear.</div>}</div>;
}

function PlanBlock({ block, topic, onClick }: { block: StudyBlock; topic?: Topic; onClick: () => void }) {
  const kindClasses = block.kind === "practice" ? "border-cyan-200 bg-cyan-50 hover:border-cyan-300" : block.kind === "review" ? "border-amber-200 bg-amber-50 hover:border-amber-300" : "border-violet-200 bg-violet-50 hover:border-violet-300";
  return <button onClick={onClick} className={`w-full rounded-xl border p-3 text-left transition ${kindClasses}`}><span className="flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500"><span>{block.hour}</span><span>{block.kind}</span></span><strong className="mt-1.5 block text-sm leading-5 text-slate-900">{block.label}</strong><span className="mt-1 block truncate text-[11px] text-slate-500">{topic?.source}</span></button>;
}

type MapPoint = { x: number; y: number; layer: number };

function mapLayout(topics: Topic[]) {
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  const layers = new Map<string, number>();
  const layerFor = (id: string, seen = new Set<string>()): number => {
    if (layers.has(id)) return layers.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const topic = byId.get(id);
    const layer = topic?.prerequisites.length ? Math.max(...topic.prerequisites.map((prerequisite) => layerFor(prerequisite, new Set(seen)))) + 1 : 0;
    layers.set(id, layer);
    return layer;
  };
  topics.forEach((topic) => layerFor(topic.id));
  const grouped = new Map<number, Topic[]>();
  topics.forEach((topic) => {
    const layer = layers.get(topic.id) ?? 0;
    grouped.set(layer, [...(grouped.get(layer) ?? []), topic]);
  });
  const maxLayer = Math.max(0, ...layers.values());
  const height = Math.max(410, ...[...grouped.values()].map((items) => items.length * 138 + 100));
  const width = Math.max(680, (maxLayer + 1) * 230 + 110);
  const points = new Map<string, MapPoint>();
  grouped.forEach((items, layer) => {
    const total = items.length * 126;
    const start = Math.max(110, (height - total) / 2 + 63);
    items.forEach((topic, index) => points.set(topic.id, { x: 120 + layer * 230, y: start + index * 126, layer }));
  });
  return { points, width, height, maxLayer };
}

function LearningMapView({
  course,
  plan,
  selectedTopicId,
  onSelectTopic,
  onEditTopic,
  onOpenSource,
}: {
  course: Course;
  plan: PlanResult;
  selectedTopicId: string;
  onSelectTopic: (id: string) => void;
  onEditTopic: (id: string) => void;
  onOpenSource: (source: CourseSource) => void;
}) {
  const mapScrollRef = useRef<HTMLDivElement>(null);
  const { points, width, height, maxLayer } = useMemo(() => mapLayout(course.topics), [course.topics]);
  const byId = useMemo(() => new Map(course.topics.map((topic) => [topic.id, topic])), [course.topics]);
  const selectedTopic = byId.get(selectedTopicId) ?? course.topics[0];
  const dependentIds = dependentTopicIds(selectedTopic.id, course.topics);
  return <div className="animate-[fade-in_0.35s_ease-out] space-y-5">
    <section className="overflow-hidden rounded-[2rem] border border-slate-900 bg-slate-950 text-white shadow-2xl shadow-slate-950/20">
      <div className="relative p-6 sm:p-8"><div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-violet-500/25 blur-3xl" /><div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.17em] text-violet-300">Editable learning map</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">See the path before you spend the hour.</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Every edge is a prerequisite promise. Edit a node or connection and StudyForge validates the graph before it schedules anything.</p></div><div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-white/10 px-3 py-2">{course.topics.length} concepts</span><span className="rounded-full bg-white/10 px-3 py-2">{maxLayer + 1} learning layers</span><span className="rounded-full bg-emerald-400/15 px-3 py-2 text-emerald-200">Cycle-safe</span></div></div></div>
    </section>

    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white/90 shadow-[0_20px_50px_-35px_rgba(30,41,59,0.4)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-5"><div className="flex flex-wrap items-center gap-3"><span className="text-sm font-bold">Concept graph</span><span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-500" /> completed</span><span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-amber-400" /> in progress</span><span className="flex items-center gap-1.5 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-slate-300" /> queued</span></div><button onClick={() => mapScrollRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" })} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-violet-300"><Icon name="target" /> Fit map</button></div>
        <div ref={mapScrollRef} className="overflow-auto bg-[radial-gradient(circle_at_1px_1px,_rgba(148,163,184,0.22)_1px,_transparent_0)] [background-size:22px_22px] p-4 sm:p-6">
          <div className="relative rounded-2xl border border-slate-200/70 bg-white/65 shadow-inner" style={{ width, height }}>
            <svg width={width} height={height} className="absolute inset-0 overflow-visible" aria-hidden="true">
              <defs><marker id="forge-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#c4b5fd" /></marker></defs>
              {course.topics.flatMap((topic) => topic.prerequisites.map((prerequisite) => {
                const from = points.get(prerequisite);
                const to = points.get(topic.id);
                if (!from || !to) return null;
                const control = Math.max(70, (to.x - from.x) / 2);
                return <path key={`${prerequisite}-${topic.id}`} d={`M ${from.x + 82} ${from.y} C ${from.x + control} ${from.y}, ${to.x - control} ${to.y}, ${to.x - 82} ${to.y}`} stroke={selectedTopic.id === topic.id || selectedTopic.id === prerequisite ? "#8b5cf6" : "#cbd5e1"} strokeWidth={selectedTopic.id === topic.id || selectedTopic.id === prerequisite ? 2.5 : 1.5} fill="none" markerEnd="url(#forge-arrow)" className="transition-all" />;
              }))}
            </svg>
            {course.topics.map((topic) => {
              const point = points.get(topic.id);
              if (!point) return null;
              const scheduled = plan.selectedTopicIds.includes(topic.id);
              const selected = topic.id === selectedTopic.id;
              const statusDot = topic.status === "completed" ? "bg-emerald-500" : topic.status === "in_progress" ? "bg-amber-400" : topic.status === "struggling" ? "bg-rose-500" : "bg-slate-300";
              return <button key={topic.id} onClick={() => onSelectTopic(topic.id)} style={{ left: point.x, top: point.y }} className={`absolute w-40 -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-3 text-left shadow-lg transition duration-200 hover:-translate-y-[52%] focus:outline-none focus:ring-4 focus:ring-violet-200 ${selected ? "border-violet-500 bg-violet-600 text-white shadow-violet-300/50" : scheduled ? "border-cyan-200 bg-cyan-50 text-slate-900" : "border-slate-200 bg-white text-slate-900"}`}><span className="flex items-center justify-between gap-2"><span className={`h-2 w-2 rounded-full ${selected ? "bg-white" : statusDot}`} /><span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${selected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>{topic.estimatedHours}h</span></span><strong className="mt-2 block truncate text-sm">{topic.shortTitle}</strong><span className={`mt-1 block text-[10px] ${selected ? "text-violet-100" : "text-slate-500"}`}>{topic.importance}/5 exam value · {topicMastery(topic)}%</span><span className={`mt-2 block h-1 overflow-hidden rounded-full ${selected ? "bg-white/20" : "bg-slate-100"}`}><span className={`block h-full rounded-full ${selected ? "bg-white" : "bg-violet-500"}`} style={{ width: `${topicMastery(topic)}%` }} /></span></button>;
            })}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 p-4 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><Icon name="arrow" className="text-violet-500" /> Arrows point toward the topic that depends on the earlier one.</span><span className="inline-flex items-center gap-1.5"><Icon name="lock" className="text-slate-400" /> The plan only schedules a node after its edge path is protected.</span></div>
      </section>

      <aside className="space-y-5">
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_50px_-35px_rgba(30,41,59,0.4)]"><div className="flex items-start justify-between gap-3"><div><span className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Node inspector</span><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">{selectedTopic.shortTitle}</h2></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusClasses[selectedTopic.status]}`}>{statusLabel(selectedTopic.status)}</span></div><p className="mt-3 text-sm leading-6 text-slate-600">{selectedTopic.description}</p><div className="mt-4 grid grid-cols-2 gap-2"><InspectorMetric label="Confidence" value={`${topicMastery(selectedTopic)}%`} /><InspectorMetric label="Effort" value={compactHours(selectedTopic.estimatedHours)} /><InspectorMetric label="Importance" value={`${selectedTopic.importance}/5`} /><InspectorMetric label="Scheduled" value={plan.selectedTopicIds.includes(selectedTopic.id) ? "Yes" : "Later"} /></div><div className="mt-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Prerequisites</p><div className="mt-2 flex flex-wrap gap-1.5">{selectedTopic.prerequisites.length ? selectedTopic.prerequisites.map((id) => <button key={id} onClick={() => onSelectTopic(id)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-violet-100 hover:text-violet-700">{byId.get(id)?.shortTitle}</button>) : <span className="text-xs text-slate-400">Foundation node</span>}</div></div><div className="mt-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Unlocks</p><div className="mt-2 flex flex-wrap gap-1.5">{dependentIds.length ? dependentIds.map((id) => <button key={id} onClick={() => onSelectTopic(id)} className="rounded-lg bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100">{byId.get(id)?.shortTitle}</button>) : <span className="text-xs text-slate-400">No downstream nodes</span>}</div></div><button onClick={() => onEditTopic(selectedTopic.id)} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 text-sm font-bold text-white hover:bg-slate-800"><Icon name="edit" /> Edit node & edges</button></section>

        <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_50px_-35px_rgba(30,41,59,0.4)]"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Connected material</p><div className="mt-3 space-y-2">{course.sources.map((source) => <button key={source.id} onClick={() => onOpenSource(source)} className="flex w-full items-center gap-3 rounded-xl border border-slate-200 p-3 text-left hover:border-violet-300 hover:bg-violet-50/40"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600"><Icon name={sourceIcon(source.kind)} /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-bold">{source.title}</span><span className="block truncate text-[10px] text-slate-500">{source.detail}</span></span><Icon name="chevron" className="text-slate-400" /></button>)}</div></section>
      </aside>
    </div>
  </div>;
}

function InspectorMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-slate-50 p-2.5"><span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</span><strong className="mt-1 block text-sm">{value}</strong></div>;
}

function NotebookView({
  course,
  selectedTopic,
  search,
  setSearch,
  kind,
  setKind,
  newNoteOpen,
  setNewNoteOpen,
  onAddNote,
  onSelectTopic,
  setToast,
}: {
  course: Course;
  selectedTopic: Topic;
  search: string;
  setSearch: (value: string) => void;
  kind: NotebookItemKind | "all";
  setKind: (value: NotebookItemKind | "all") => void;
  newNoteOpen: boolean;
  setNewNoteOpen: (value: boolean) => void;
  onAddNote: (item: NotebookItem) => void;
  onSelectTopic: (id: string) => void;
  setToast: (value: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(course.notes[0]?.id ?? null);
  const filtered = course.notes.filter((note) => {
    const matchText = `${note.title} ${note.body}`.toLowerCase().includes(search.toLowerCase());
    return matchText && (kind === "all" || note.kind === kind);
  });
  const topicForNote = (note: NotebookItem) => course.topics.find((topic) => topic.id === note.topicId);
  return <div className="animate-[fade-in_0.35s_ease-out] space-y-5">
    <section className="overflow-hidden rounded-[2rem] border border-slate-900 bg-slate-950 text-white shadow-2xl shadow-slate-950/20"><div className="relative p-6 sm:p-8"><div className="absolute -right-28 -top-20 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl" /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.17em] text-amber-300">Course notebook</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Keep what you earned, not just what you read.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Save coach answers, visual models, formula sheets, and quiz evidence with the topic and source they came from.</p></div><button onClick={() => setNewNoteOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-bold text-amber-950 shadow-lg shadow-amber-300/20 hover:bg-amber-200"><Icon name="plus" /> New note</button></div></div></section>

    <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_50px_-35px_rgba(30,41,59,0.4)] sm:p-6"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="relative flex-1"><Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your notes, quiz explanations, and formula sheets…" className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></div><div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1">{(["all", "note", "formula", "visual", "quiz", "chat"] as const).map((item) => <button key={item} onClick={() => setKind(item)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition ${kind === item ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>{item === "all" ? "All" : kindLabel(item)}</button>)}</div></div>
      {newNoteOpen && <NewNoteComposer selectedTopic={selectedTopic} onCancel={() => setNewNoteOpen(false)} onSave={(item) => { onAddNote(item); setNewNoteOpen(false); }} />}
      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-3 sm:grid-cols-2">{filtered.length ? filtered.map((note) => <article key={note.id} className={`group rounded-2xl border p-4 transition ${expandedId === note.id ? "border-violet-300 bg-violet-50/50 shadow-lg shadow-violet-100" : "border-slate-200 bg-white hover:border-violet-200"}`}><div className="flex items-start justify-between gap-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${note.kind === "formula" ? "bg-cyan-100 text-cyan-800" : note.kind === "visual" ? "bg-violet-100 text-violet-800" : note.kind === "quiz" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{kindLabel(note.kind)}</span>{note.pinned && <Icon name="spark" className="text-amber-500" />}</div><button onClick={() => setExpandedId(note.id)} className="mt-4 text-left"><h3 className="text-base font-bold tracking-[-0.02em]">{note.title}</h3><p className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-6 text-slate-600">{note.body}</p></button><div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500"><span className="truncate">{topicForNote(note)?.shortTitle ?? "Course artifact"}</span><span>{new Date(note.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span></div></article>) : <div className="col-span-full rounded-2xl border border-dashed border-slate-200 p-10 text-center"><Icon name="book" className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-600">No saved artifacts match that filter.</p><button onClick={() => { setSearch(""); setKind("all"); }} className="mt-2 text-xs font-bold text-violet-700">Clear filters</button></div>}</div>
        <aside className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">{(() => {
          const note = filtered.find((item) => item.id === expandedId) ?? filtered[0];
          if (!note) return <div className="grid min-h-56 place-items-center text-center text-sm text-slate-500">Select a notebook item to see its source and next step.</div>;
          const linkedTopic = topicForNote(note);
          return <><span className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600">Artifact detail</span><h3 className="mt-1 text-lg font-bold">{note.title}</h3><p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-700">{note.body}</p><div className="mt-5 rounded-xl border border-white bg-white p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Connected context</p><p className="mt-1 text-xs font-semibold text-slate-700">{linkedTopic?.shortTitle ?? "Course-wide note"}</p><p className="mt-1 text-xs leading-5 text-slate-500">{note.sourceLabel ?? linkedTopic?.source ?? "Created in StudyForge"}</p></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => { void navigator.clipboard?.writeText(note.body); setToast("Notebook item copied to your clipboard."); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-violet-300"><Icon name="copy" /> Copy</button>{linkedTopic && <button onClick={() => onSelectTopic(linkedTopic.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white"><Icon name="arrow" /> Open topic</button>}</div></>;
        })()}</aside>
      </div>
    </section>
  </div>;
}

function NewNoteComposer({ selectedTopic, onCancel, onSave }: { selectedTopic: Topic; onCancel: () => void; onSave: (item: NotebookItem) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    onSave({ id: `note-${Date.now().toString(36)}`, title: title.trim(), body: body.trim(), kind: "note", topicId: selectedTopic.id, sourceLabel: selectedTopic.source, createdAt: new Date().toISOString() });
  };
  return <form onSubmit={save} className="mt-5 rounded-2xl border border-violet-200 bg-violet-50/70 p-4"><div className="flex items-center justify-between"><p className="text-sm font-bold text-violet-950">New note for {selectedTopic.shortTitle}</p><button type="button" onClick={onCancel} className="text-xs font-bold text-violet-700">Cancel</button></div><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title your insight" className="mt-3 h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm outline-none focus:ring-4 focus:ring-violet-100" required /><textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="What do you want future-you to remember?" rows={4} className="mt-2 w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm leading-6 outline-none focus:ring-4 focus:ring-violet-100" required /><button className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white"><Icon name="check" /> Save to notebook</button></form>;
}

function ProgressView({ course, plan, mastery, selectedTopic, onSelectTopic }: { course: Course; plan: PlanResult; mastery: number; selectedTopic: Topic; onSelectTopic: (id: string) => void }) {
  const completed = course.topics.filter((topic) => topic.status === "completed");
  const atRisk = course.topics.filter((topic) => topic.status === "struggling" || (topic.status !== "completed" && topicMastery(topic) < 35));
  const completedHours = completed.reduce((total, topic) => total + topic.estimatedHours, 0);
  const totalHours = course.topics.reduce((total, topic) => total + topic.estimatedHours, 0);
  const ringStyle = { background: `conic-gradient(#7c3aed ${mastery * 3.6}deg, #eef2ff 0deg)` };
  return <div className="animate-[fade-in_0.35s_ease-out] space-y-5">
    <section className="overflow-hidden rounded-[2rem] border border-slate-900 bg-slate-950 text-white shadow-2xl shadow-slate-950/20"><div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between"><div className="absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-violet-500/20 blur-3xl" /><div className="relative"><p className="text-[11px] font-bold uppercase tracking-[0.17em] text-violet-300">Progress that means something</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">Coverage is not mastery. See both.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">StudyForge keeps schedule coverage, completed work, and self-reported confidence separate so a full calendar never pretends you already know it.</p></div><div className="relative flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.06] p-4"><div className="grid h-24 w-24 place-items-center rounded-full p-2" style={ringStyle}><div className="grid h-full w-full place-items-center rounded-full bg-slate-950"><span className="text-2xl font-semibold">{mastery}%</span><span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">mastery</span></div></div><div><p className="text-xs font-bold text-violet-200">Confidence signal</p><p className="mt-1 max-w-40 text-xs leading-5 text-slate-300">A living signal from completion, struggle flags, and the checks you take.</p></div></div></div></section>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <div className="space-y-5"><section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_50px_-35px_rgba(30,41,59,0.4)] sm:p-6"><div className="flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Map health</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Where your attention should go</h2></div><span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">{courseDeadlineLabel(course.deadline)}</span></div><div className="mt-5 space-y-3">{course.topics.map((topic) => <button key={topic.id} onClick={() => onSelectTopic(topic.id)} className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-3 text-left transition hover:border-violet-300 hover:bg-violet-50/40"><span className={`grid h-10 w-10 place-items-center rounded-xl text-xs font-bold ${topic.status === "completed" ? "bg-emerald-100 text-emerald-800" : topic.status === "struggling" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{topicMastery(topic)}%</span><span className="min-w-0 flex-1"><strong className="block text-sm">{topic.shortTitle}</strong><span className="block text-xs text-slate-500">{topic.status === "completed" ? "Completed" : topic.status === "struggling" ? "Recovery time protected" : `${topic.estimatedHours}h estimate · ${topic.importance}/5 importance`}</span></span><span className="h-2 w-24 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${topic.status === "struggling" ? "bg-rose-500" : topic.status === "completed" ? "bg-emerald-500" : "bg-violet-500"}`} style={{ width: `${topicMastery(topic)}%` }} /></span><Icon name="chevron" className="text-slate-400" /></button>)}</div></section>
        <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_50px_-35px_rgba(30,41,59,0.4)] sm:p-6"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Momentum</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Hours, not wishful thinking</h2><div className="mt-5 grid grid-cols-3 gap-3"><MiniMetric label="Done" value={`${completedHours}h`} detail="completed" icon="check" /><MiniMetric label="In plan" value={`${plan.scheduledHours}h`} detail="protected" icon="calendar" /><MiniMetric label="Course" value={`${totalHours}h`} detail="estimated" icon="clock" /></div><div className="mt-5 rounded-2xl bg-slate-50 p-4"><div className="flex items-end justify-between"><span className="text-sm font-bold">Completion momentum</span><span className="text-xl font-semibold">{Math.round((completedHours / Math.max(1, totalHours)) * 100)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: `${Math.round((completedHours / Math.max(1, totalHours)) * 100)}%` }} /></div></div></section></div>
      <aside className="space-y-5"><section className="rounded-3xl border border-rose-200 bg-rose-50/80 p-5"><div className="flex items-center gap-2 text-rose-900"><span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-100"><Icon name="alert" /></span><span className="font-bold">At-risk topics</span></div>{atRisk.length ? <div className="mt-4 space-y-2">{atRisk.map((topic) => <button key={topic.id} onClick={() => onSelectTopic(topic.id)} className="w-full rounded-xl border border-rose-200 bg-white/80 p-3 text-left hover:bg-white"><strong className="block text-sm text-rose-950">{topic.shortTitle}</strong><span className="mt-1 block text-xs leading-5 text-rose-800">{topic.status === "struggling" ? "Needs a protected recovery block." : `Confidence is ${topicMastery(topic)}%. Run a quick retrieval check.`}</span></button>)}</div> : <p className="mt-4 text-sm leading-6 text-rose-900">No weak signal is currently blocking your planned path. Keep the recovery buffer for surprise difficulty.</p>}</section><section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_50px_-35px_rgba(30,41,59,0.4)]"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Current focus</p><h2 className="mt-1 text-lg font-semibold">{selectedTopic.shortTitle}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{selectedTopic.description}</p><button onClick={() => onSelectTopic(selectedTopic.id)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-3 text-xs font-bold text-white"><Icon name="play" /> Resume focused block</button></section></aside>
    </div>
  </div>;
}

function PortfolioView({ courses, activeCourseId, onOpenCourse, onCreateCourse }: { courses: Course[]; activeCourseId: string; onOpenCourse: (id: string) => void; onCreateCourse: () => void }) {
  const coursePlans = courses.map((course) => ({ course, plan: buildStudyPlan(course.topics, course.constraints) })).sort((a, b) => a.course.deadline.localeCompare(b.course.deadline));
  const totalProtectedHours = coursePlans.reduce((sum, entry) => sum + entry.plan.scheduledHours, 0);
  const dueSoon = coursePlans[0];
  return <div className="animate-[fade-in_0.35s_ease-out] space-y-5"><section className="overflow-hidden rounded-[2rem] border border-slate-900 bg-slate-950 text-white shadow-2xl shadow-slate-950/20"><div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between"><div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" /><div className="relative"><p className="text-[11px] font-bold uppercase tracking-[0.17em] text-cyan-300">Multi-course control room</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">See the pressure without mixing the paths.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Each course retains its own source map, deadline, and prerequisite-safe plan. Your portfolio view makes the collision points visible.</p></div><div className="relative grid grid-cols-2 gap-3"><HeroStat label="Courses" value={String(courses.length)} /><HeroStat label="Protected" value={`${totalProtectedHours}h`} /></div></div></section>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]"><section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_50px_-35px_rgba(30,41,59,0.4)] sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Course queue</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">The next meaningful block in every course</h2></div><button onClick={onCreateCourse} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white"><Icon name="plus" /> Add course</button></div><div className="mt-5 space-y-3">{coursePlans.map(({ course, plan }) => { const next = plan.blocks[0]; const accent = courseAccent[course.color]; return <article key={course.id} className={`rounded-2xl border p-4 transition ${course.id === activeCourseId ? "border-violet-300 bg-violet-50/50" : "border-slate-200 bg-white"}`}><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl text-xs font-bold ${accent.soft}`}>{initials(course.shortName)}</span><div><h3 className="text-base font-bold">{course.shortName}</h3><p className="mt-0.5 text-xs text-slate-500">{courseDeadlineLabel(course.deadline)} · {plan.coverage}% coverage</p></div></div><span className={`h-2.5 w-2.5 rounded-full ${accent.dot}`} /></div><div className="mt-4 rounded-xl bg-slate-50 p-3"><span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Next block</span><p className="mt-1 text-sm font-semibold">{next ? next.label : "Plan complete"}</p><p className="mt-1 text-xs text-slate-500">{next ? `${next.day} · ${next.hour}` : "Nothing remaining in this course"}</p></div><div className="mt-3 flex items-center justify-between"><span className="text-xs text-slate-500">{plan.scheduledHours}/{plan.capacityHours}h in plan · {plan.bufferHours}h buffer</span><button onClick={() => onOpenCourse(course.id)} className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-700">Open course <Icon name="arrow" className="h-3.5 w-3.5" /></button></div></article>; })}</div></section><aside className="space-y-5"><section className="rounded-3xl border border-amber-200 bg-amber-50/80 p-5"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700">Nearest deadline</p><h2 className="mt-2 text-xl font-semibold text-amber-950">{dueSoon?.course.shortName}</h2><p className="mt-2 text-sm leading-6 text-amber-900">{dueSoon ? `${courseDeadlineLabel(dueSoon.course.deadline)} · ${dueSoon.plan.scheduledHours}h currently protected.` : "Add a course to start your portfolio."}</p>{dueSoon && <button onClick={() => onOpenCourse(dueSoon.course.id)} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-amber-300 px-3 text-xs font-bold text-amber-950"><Icon name="target" /> Review priority</button>}</section><section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-[0_20px_50px_-35px_rgba(30,41,59,0.4)]"><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-violet-600">Portfolio rule</p><p className="mt-2 text-sm leading-6 text-slate-600">A course can be urgent without stealing the prerequisite path from another. Switch courses to tune its availability or priority; the individual plan will show the consequences.</p></section></aside></div>
  </div>;
}

function CourseWizard({ onClose, onCreate }: { onClose: () => void; onCreate: (course: Course) => void }) {
  const defaultDeadline = useMemo(() => { const date = new Date(); date.setDate(date.getDate() + 7); return date.toISOString().slice(0, 10); }, []);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState("");
  const [deadline, setDeadline] = useState(defaultDeadline);
  const [days, setDays] = useState(7);
  const [hoursPerDay, setHoursPerDay] = useState(1);
  const [sourceKind, setSourceKind] = useState<SourceKind>("text");
  const [sourceText, setSourceText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [stage, setStage] = useState("Reading your course context…");

  const nextFromBasics = () => {
    if (!name.trim()) {
      setError("Give this course a name before we forge the map.");
      return;
    }
    setError("");
    setStep(2);
  };

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    if (selected && !sourceText) setSourceText(`Material file: ${selected.name}`);
  };

  const buildCourse = async () => {
    if (sourceKind === "youtube" && !sourceUrl.trim()) {
      setError("Paste a public YouTube URL, or pick a different source type.");
      return;
    }
    if (sourceKind === "pdf" && !file) {
      setError("Choose a PDF or switch to pasted text.");
      return;
    }
    if (sourceKind === "text" && !sourceText.trim()) {
      setError("Paste a syllabus, outline, or source excerpt so we can start the map.");
      return;
    }
    setError("");
    setStep(3);
    const sourceTitle = file?.name || (sourceKind === "youtube" ? sourceUrl.trim() : "Pasted course material");
    const source: CourseSource = {
      id: `source-${Date.now().toString(36)}`,
      kind: sourceKind,
      title: sourceTitle,
      detail: sourceKind === "pdf" ? `${file ? `${Math.round(file.size / 1024)} KB` : "PDF"} · editable source map` : sourceKind === "youtube" ? "YouTube link · add a transcript for deeper grounding" : "Pasted text · editable source map",
      excerpt: sourceText.trim().slice(0, 1_200) || undefined,
      url: sourceKind === "youtube" ? sourceUrl.trim() : undefined,
    };
    await new Promise((resolve) => window.setTimeout(resolve, 280));
    setStage("Finding concepts and their prerequisite paths…");
    let aiTopics: Topic[] | null = null;
    const requestController = new AbortController();
    const requestTimeout = window.setTimeout(() => requestController.abort(), 4_500);
    try {
      const form = new FormData();
      form.append("courseName", name.trim());
      form.append("sourceKind", sourceKind);
      form.append("sourceText", sourceText.trim());
      form.append("sourceUrl", sourceUrl.trim());
      if (file) form.append("file", file);
      const response = await fetch("/api/ingest", { method: "POST", body: form, signal: requestController.signal });
      if (response.ok) {
        const payload = (await response.json()) as { topics?: unknown };
        aiTopics = sanitizeGeneratedTopics(payload.topics, source.title);
      }
    } catch {
      // A local editable draft is deliberately available without a provider connection.
    } finally {
      window.clearTimeout(requestTimeout);
    }
    setStage("Checking the learning map and shaping your first plan…");
    await new Promise((resolve) => window.setTimeout(resolve, 260));
    const course = createCourseDraft({ name: name.trim(), deadline, days, hoursPerDay, source, rawOutline: sourceText.trim() });
    if (aiTopics) {
      course.topics = aiTopics;
      course.constraints.prioritizedTopicIds = aiTopics.slice(0, 3).map((topic) => topic.id);
      course.sources[0] = { ...source, detail: `${sourceKindLabel(source.kind)} · AI-generated editable map` };
    }
    onCreate(course);
  };

  return <ModalShell title="Forge a new course" eyebrow="Course intake" onClose={step === 3 ? undefined : onClose} wide>
    {step === 1 && <div className="space-y-5"><div><h2 className="text-2xl font-semibold tracking-[-0.04em]">Start with the constraint, not the content.</h2><p className="mt-2 text-sm leading-6 text-slate-600">StudyForge uses your real deadline and available time before it decides what can fit.</p></div><label className="block"><span className="text-xs font-bold text-slate-700">Course name</span><input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Organic Chemistry final" className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label><div className="grid gap-3 sm:grid-cols-3"><label><span className="text-xs font-bold text-slate-700">Deadline</span><input value={deadline} onChange={(event) => setDeadline(event.target.value)} type="date" className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label><label><span className="text-xs font-bold text-slate-700">Days available</span><input value={days} onChange={(event) => setDays(clamp(Number(event.target.value) || 1, 1, 30))} type="number" min={1} max={30} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label><label><span className="text-xs font-bold text-slate-700">Focus / day</span><select value={hoursPerDay} onChange={(event) => setHoursPerDay(Number(event.target.value))} className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"><option value={1}>1 hour</option><option value={2}>2 hours</option><option value={3}>3 hours</option><option value={4}>4 hours</option></select></label></div><div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm leading-6 text-violet-950"><Icon name="lock" className="mr-1 inline h-4 w-4 text-violet-600" /> Your course data starts local to this browser. An optional server-side AI route is used only when the app has been configured with a private API key.</div></div>}
    {step === 2 && <div className="space-y-5"><div><h2 className="text-2xl font-semibold tracking-[-0.04em]">What should the first map be grounded in?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Bring a PDF, a public YouTube reference, or any syllabus / lecture text. You will review every node and edge before studying it.</p></div><div className="grid gap-2 sm:grid-cols-3">{([{ kind: "text", icon: "book", title: "Paste text", detail: "Syllabus or notes" }, { kind: "pdf", icon: "file", title: "PDF", detail: "Up to 4 MB for AI intake" }, { kind: "youtube", icon: "youtube", title: "YouTube", detail: "Public reference URL" }] as Array<{ kind: SourceKind; icon: IconName; title: string; detail: string }>).map((option) => <button key={option.kind} onClick={() => setSourceKind(option.kind)} className={`rounded-2xl border p-3.5 text-left transition ${sourceKind === option.kind ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:border-violet-200"}`}><span className={`grid h-9 w-9 place-items-center rounded-xl ${sourceKind === option.kind ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600"}`}><Icon name={option.icon} /></span><strong className="mt-3 block text-sm">{option.title}</strong><span className="mt-1 block text-xs text-slate-500">{option.detail}</span></button>)}</div>{sourceKind === "text" && <label className="block"><span className="text-xs font-bold text-slate-700">Paste material</span><textarea autoFocus value={sourceText} onChange={(event) => setSourceText(event.target.value)} rows={8} placeholder={"# Week 1: Atomic structure\n# Week 2: Chemical bonding\n# Week 3: Stoichiometry"} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label>}{sourceKind === "pdf" && <label className="grid min-h-48 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/60 p-6 text-center hover:border-violet-400"><input onChange={selectFile} type="file" accept="application/pdf,.txt,.md" className="sr-only" /><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-violet-700 shadow-sm"><Icon name="upload" className="h-5 w-5" /></span><strong className="mt-3 text-sm">{file ? file.name : "Choose a PDF, Markdown, or text file"}</strong><span className="mt-1 text-xs text-slate-500">The original stays in your browser. A configured AI route reads a temporary upload only to draft the map.</span></label>}{sourceKind === "youtube" && <div className="space-y-3"><label className="block"><span className="text-xs font-bold text-slate-700">Public YouTube URL</span><input autoFocus value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=…" type="url" className="mt-1.5 h-12 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label><label className="block"><span className="text-xs font-bold text-slate-700">Transcript or syllabus extract (recommended)</span><textarea value={sourceText} onChange={(event) => setSourceText(event.target.value)} rows={4} placeholder="Paste a transcript excerpt to make the map more specific." className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label></div>}{error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">{error}</p>}</div>}
    {step === 3 && <div className="grid min-h-80 place-items-center text-center"><div><span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-violet-100 text-violet-700"><Icon name="spark" className="h-7 w-7 animate-pulse" /></span><h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em]">Building your editable study system</h2><p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">{stage}</p><div className="mx-auto mt-6 h-1.5 w-56 overflow-hidden rounded-full bg-slate-100"><div className="h-full w-2/3 animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" /></div></div></div>}
    {step < 3 && <div className="mt-7 flex items-center justify-between border-t border-slate-100 pt-5"><button onClick={step === 1 ? onClose : () => setStep(1)} className="rounded-xl px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">{step === 1 ? "Cancel" : "Back"}</button><button onClick={step === 1 ? nextFromBasics : buildCourse} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800">{step === 1 ? "Add material" : "Build learning map"}<Icon name="arrow" /></button></div>}
  </ModalShell>;
}

function TopicEditor({ topic, topics, onClose, onSave }: { topic: Topic; topics: Topic[]; onClose: () => void; onSave: (topic: Topic) => void }) {
  const [draft, setDraft] = useState<Topic>({ ...topic, prerequisites: [...topic.prerequisites] });
  const [error, setError] = useState("");
  const togglePrerequisite = (id: string) => setDraft((previous) => ({ ...previous, prerequisites: previous.prerequisites.includes(id) ? previous.prerequisites.filter((item) => item !== id) : [...previous.prerequisites, id] }));
  const save = (event: FormEvent) => {
    event.preventDefault();
    const normalized = { ...draft, title: draft.title.trim(), shortTitle: draft.shortTitle.trim(), estimatedHours: clamp(Number(draft.estimatedHours), 1, 4), importance: clamp(Number(draft.importance), 1, 5), confidence: clamp(Number(draft.confidence ?? 20), 0, 100) };
    const nextTopics = topics.map((item) => item.id === normalized.id ? normalized : item);
    const graphError = validateCourseGraph(nextTopics);
    if (graphError) { setError(graphError); return; }
    onSave(normalized);
  };
  return <ModalShell title={`Edit ${topic.shortTitle}`} eyebrow="Learning-map node" onClose={onClose} wide><form onSubmit={save} className="space-y-5"><p className="text-sm leading-6 text-slate-600">Update the node, then choose only the topics that must be understood before it. StudyForge will refuse missing links or cycles.</p><div className="grid gap-3 sm:grid-cols-2"><label><span className="text-xs font-bold text-slate-700">Full title</span><input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" required /></label><label><span className="text-xs font-bold text-slate-700">Short label</span><input value={draft.shortTitle} onChange={(event) => setDraft({ ...draft, shortTitle: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" required /></label></div><label className="block"><span className="text-xs font-bold text-slate-700">What should this block teach?</span><textarea value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={3} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm leading-6 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label><div className="grid gap-3 sm:grid-cols-4"><label><span className="text-xs font-bold text-slate-700">Hours</span><input value={draft.estimatedHours} onChange={(event) => setDraft({ ...draft, estimatedHours: Number(event.target.value) })} type="number" min={1} max={4} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400" /></label><label><span className="text-xs font-bold text-slate-700">Importance</span><input value={draft.importance} onChange={(event) => setDraft({ ...draft, importance: Number(event.target.value) })} type="number" min={1} max={5} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400" /></label><label><span className="text-xs font-bold text-slate-700">Confidence</span><input value={draft.confidence ?? 20} onChange={(event) => setDraft({ ...draft, confidence: Number(event.target.value) })} type="number" min={0} max={100} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400" /></label><label><span className="text-xs font-bold text-slate-700">Status</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as TopicStatus })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400"><option value="not_started">Not started</option><option value="in_progress">In progress</option><option value="struggling">Struggling</option><option value="completed">Completed</option></select></label></div><label className="block"><span className="text-xs font-bold text-slate-700">Source citation</span><input value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100" /></label><div><div className="flex items-center justify-between"><span className="text-xs font-bold text-slate-700">Prerequisite edges</span><span className="text-[11px] text-slate-500">Choose what must come first</span></div><div className="mt-2 grid gap-2 sm:grid-cols-2">{topics.filter((candidate) => candidate.id !== topic.id).map((candidate) => <label key={candidate.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${draft.prerequisites.includes(candidate.id) ? "border-violet-300 bg-violet-50" : "border-slate-200 hover:border-violet-200"}`}><input checked={draft.prerequisites.includes(candidate.id)} onChange={() => togglePrerequisite(candidate.id)} type="checkbox" className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500" /><span className="min-w-0"><span className="block text-sm font-bold">{candidate.shortTitle}</span><span className="block text-[11px] text-slate-500">{candidate.estimatedHours}h · {statusLabel(candidate.status)}</span></span></label>)}</div></div>{error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800"><Icon name="alert" className="mr-1 inline" /> {error}</p>}<div className="flex justify-end gap-2 border-t border-slate-100 pt-5"><button type="button" onClick={onClose} className="min-h-11 rounded-xl px-4 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancel</button><button className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white hover:bg-violet-700"><Icon name="check" /> Validate & save</button></div></form></ModalShell>;
}

function ReplanModal({ replan, topics, onClose, onUndo }: { replan: ReplanState; topics: Topic[]; onClose: () => void; onUndo: () => void }) {
  const beforeNames = new Map(replan.beforeTopics.map((topic) => [topic.id, topic.shortTitle]));
  const afterNames = new Map(topics.map((topic) => [topic.id, topic.shortTitle]));
  const moved = getMovedBlocks(replan.before, replan.after, topics);
  const removed = replan.before.selectedTopicIds.filter((id) => !replan.after.selectedTopicIds.includes(id)).map((id) => beforeNames.get(id)).filter(Boolean);
  const added = replan.after.selectedTopicIds.filter((id) => !replan.before.selectedTopicIds.includes(id)).map((id) => afterNames.get(id)).filter(Boolean);
  const coverageChange = replan.after.coverage - replan.before.coverage;
  return <ModalShell title="Your plan has been recalculated" eyebrow="Explainable replan" onClose={onClose} wide><div className="space-y-5"><div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-cyan-50 p-4"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-600 text-white"><Icon name="spark" /></span><div><h2 className="text-lg font-bold text-violet-950">{replan.title}</h2><p className="mt-1 text-sm leading-6 text-violet-800">{replan.reason}</p></div></div></div><div className="grid gap-3 sm:grid-cols-3"><ReplanMetric label="Coverage" before={`${replan.before.coverage}%`} after={`${replan.after.coverage}%`} intent={coverageChange === 0 ? "held" : coverageChange > 0 ? "gained" : "traded"} /><ReplanMetric label="Planned hours" before={`${replan.before.scheduledHours}h`} after={`${replan.after.scheduledHours}h`} intent="re-sequenced" /><ReplanMetric label="Recovery buffer" before={`${replan.before.bufferHours}h`} after={`${replan.after.bufferHours}h`} intent="protected" /></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">What moved</p><div className="mt-3 space-y-2">{moved.length ? moved.map((line) => <p key={line} className="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700"><Icon name="arrow" className="mr-1.5 inline text-violet-600" /> {line}</p>) : <p className="text-sm leading-6 text-slate-500">The sequence stayed stable; only effort or coverage changed.</p>}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Scope change</p><div className="mt-3 space-y-2">{added.length > 0 && <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-900"><strong>Added:</strong> {added.join(", ")}</p>}{removed.length > 0 && <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-900"><strong>Deferred:</strong> {removed.join(", ")}</p>}{!added.length && !removed.length && <p className="text-sm leading-6 text-slate-500">The same topic set remains in scope, but timing or practice depth changed.</p>}</div></div></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-950"><Icon name="lock" className="mr-1 inline text-emerald-700" /> <strong>Prerequisite check passed.</strong> Every scheduled dependent still has a completed or scheduled prerequisite path.</div><div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5"><button onClick={onUndo} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:border-rose-300 hover:text-rose-700">Undo change</button><button onClick={onClose} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white hover:bg-slate-800">Keep revised plan <Icon name="check" /></button></div></div></ModalShell>;
}

function ReplanMetric({ label, before, after, intent }: { label: string; before: string; after: string; intent: string }) {
  return <div className="rounded-2xl bg-slate-50 p-3.5"><span className="block text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500">{label}</span><div className="mt-2 flex items-center gap-2"><strong className="text-base text-slate-400 line-through">{before}</strong><Icon name="arrow" className="h-3.5 w-3.5 text-violet-500" /><strong className="text-xl tracking-[-0.03em]">{after}</strong></div><span className="mt-1 block text-[11px] font-semibold text-violet-600">{intent}</span></div>;
}

function QuizModal({ state, onClose, onAnswer, onSubmit, onSave }: { state: QuizState; onClose: () => void; onAnswer: (index: number, answer: number) => void; onSubmit: () => void; onSave: () => void }) {
  const correct = state.answers.reduce<number>((count, answer, index) => count + (answer === state.quiz.questions[index].answer ? 1 : 0), 0);
  const unanswered = state.answers.some((answer) => answer === null);
  return <ModalShell title={state.quiz.title} eyebrow={`${state.topic.shortTitle} · active recall`} onClose={onClose} wide><div className="space-y-5"><div className="rounded-2xl border border-violet-200 bg-violet-50 p-4"><p className="text-sm leading-6 text-violet-950">Try this cold. A wrong answer with a clear explanation tells the planner more than rereading another page.</p></div>{state.quiz.questions.map((question, index) => <section key={question.prompt} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600">Question {index + 1} of {state.quiz.questions.length}</p><h2 className="mt-2 text-base font-bold leading-6">{question.prompt}</h2><div className="mt-3 grid gap-2">{question.choices.map((choice, choiceIndex) => { const selected = state.answers[index] === choiceIndex; const correctChoice = state.submitted && choiceIndex === question.answer; const incorrectChoice = state.submitted && selected && choiceIndex !== question.answer; return <button key={choice} disabled={state.submitted} onClick={() => onAnswer(index, choiceIndex)} className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 text-left text-sm transition ${correctChoice ? "border-emerald-300 bg-emerald-50 text-emerald-950" : incorrectChoice ? "border-rose-300 bg-rose-50 text-rose-950" : selected ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:border-violet-200"}`}><span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold ${correctChoice ? "bg-emerald-500 text-white" : incorrectChoice ? "bg-rose-500 text-white" : selected ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-500"}`}>{String.fromCharCode(65 + choiceIndex)}</span>{choice}{correctChoice && <Icon name="check" className="ml-auto text-emerald-600" />}</button>; })}</div>{state.submitted && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm leading-6 text-slate-700"><strong>Why:</strong> {question.explanation}</p>}</section>)}{state.submitted && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-lg font-bold text-amber-950">{correct}/{state.quiz.questions.length} correct</p><p className="mt-1 text-sm leading-6 text-amber-900">Save this evidence to your notebook, then be honest about whether the current confidence signal needs more recovery time.</p></div>}<div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-5"><button onClick={onClose} className="min-h-11 rounded-xl px-4 text-sm font-bold text-slate-600 hover:bg-slate-100">Close</button>{state.submitted ? <button onClick={onSave} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white"><Icon name="book" /> Save result</button> : <button disabled={unanswered} onClick={onSubmit} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Check answers <Icon name="arrow" /></button>}</div></div></ModalShell>;
}

function SourcePreview({ source, onClose }: { source: CourseSource; onClose: () => void }) {
  return <ModalShell title={source.title} eyebrow={`${sourceKindLabel(source.kind)} source`} onClose={onClose}><div className="space-y-5"><div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-violet-700 shadow-sm"><Icon name={sourceIcon(source.kind)} /></span><div><p className="text-sm font-bold">{source.title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{source.detail}</p></div></div>{source.excerpt ? <div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-600">Saved source context</p><p className="mt-2 whitespace-pre-line rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">{source.excerpt}</p></div> : <p className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm leading-6 text-slate-600">This source is attached to the course by title and metadata. Add a transcript or paste an excerpt during intake when you want local source context visible here.</p>}{source.url && <button onClick={() => window.open(source.url, "_blank", "noopener,noreferrer")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white"><Icon name="youtube" /> Open original source</button>}<div className="border-t border-slate-100 pt-4 text-xs leading-5 text-slate-500">StudyForge uses the source label on every topic, chat response, and saved artifact so you can check where a learning prompt came from.</div></div></ModalShell>;
}

function ModalShell({ title, eyebrow, onClose, children, wide = false }: { title: string; eyebrow: string; onClose?: () => void; children: React.ReactNode; wide?: boolean }) {
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}><div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-[2rem] border border-white/70 bg-[#fbfbfd] shadow-2xl sm:rounded-[2rem] ${wide ? "max-w-3xl" : "max-w-xl"}`}><div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-[#fbfbfd]/95 px-5 py-4 backdrop-blur sm:px-6"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">{eyebrow}</p><h1 className="mt-1 text-lg font-semibold tracking-[-0.03em]">{title}</h1></div>{onClose && <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Close dialog"><Icon name="close" /></button>}</div><div className="p-5 sm:p-6">{children}</div></div></div>;
}
