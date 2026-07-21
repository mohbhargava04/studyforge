import {
  initialTopics,
  type PlannerConstraints,
  type Topic,
  type TopicStatus,
} from "@/lib/planner";

export type SourceKind = "pdf" | "youtube" | "text" | "manual";

export type CourseSource = {
  id: string;
  kind: SourceKind;
  title: string;
  detail: string;
  excerpt?: string;
  url?: string;
};

export type NotebookItemKind = "note" | "formula" | "visual" | "quiz" | "chat";

export type NotebookItem = {
  id: string;
  title: string;
  body: string;
  kind: NotebookItemKind;
  topicId?: string;
  sourceLabel?: string;
  createdAt: string;
  pinned?: boolean;
};

export type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
  topicId?: string;
  sourceLabel?: string;
};

export type Course = {
  id: string;
  name: string;
  shortName: string;
  color: "violet" | "cyan" | "amber" | "rose";
  deadline: string;
  constraints: PlannerConstraints;
  topics: Topic[];
  sources: CourseSource[];
  notes: NotebookItem[];
  chat: ChatMessage[];
  createdAt: string;
};

export type Workspace = {
  version: 1;
  activeCourseId: string;
  courses: Course[];
};

export type QuizQuestion = {
  prompt: string;
  choices: string[];
  answer: number;
  explanation: string;
};

export type StudyQuiz = {
  title: string;
  questions: QuizQuestion[];
};

export const WORKSPACE_STORAGE_KEY = "studyforge-workspace-v1";

const now = () => new Date().toISOString();

function daysFromToday(days: number) {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function cloneTopics(topics: Topic[]) {
  return topics.map((topic) => ({ ...topic, prerequisites: [...topic.prerequisites] }));
}

const dsaTopics: Topic[] = cloneTopics(initialTopics).map((topic) => {
  const enrichment: Record<string, Pick<Topic, "description" | "confidence">> = {
    graphs: {
      description: "Model relationships as vertices and edges, then reason about traversal and connectivity.",
      confidence: 88,
    },
    bfs: {
      description: "Explore a graph layer by layer with a queue; use it for unweighted shortest paths.",
      confidence: 55,
    },
    dfs: {
      description: "Explore a branch deeply before backtracking; use it for reachability and structure.",
      confidence: 32,
    },
    "shortest-paths": {
      description: "Choose and relax the best known frontier path to find efficient routes through weighted graphs.",
      confidence: 22,
    },
    mst: {
      description: "Connect every vertex at minimum total weight without introducing cycles.",
      confidence: 18,
    },
    dp: {
      description: "Break a problem into overlapping subproblems and reuse the answers you have already earned.",
      confidence: 28,
    },
  };
  return { ...topic, ...enrichment[topic.id] };
});

const calculusTopics: Topic[] = [
  {
    id: "functions",
    title: "Functions and transformations",
    shortTitle: "Functions",
    estimatedHours: 1,
    importance: 4,
    prerequisites: [],
    status: "completed",
    source: "Week 1 notes · pp. 1–7",
    description: "Read a function as an input-output rule, then predict how a transformation changes it.",
    confidence: 82,
  },
  {
    id: "limits",
    title: "Limits and continuity",
    shortTitle: "Limits",
    estimatedHours: 2,
    importance: 5,
    prerequisites: ["functions"],
    status: "in_progress",
    source: "Week 2 notes · pp. 3–15",
    description: "Use numerical, graphical, and algebraic evidence to decide what a function approaches.",
    confidence: 48,
  },
  {
    id: "derivatives",
    title: "Derivative rules",
    shortTitle: "Derivatives",
    estimatedHours: 2,
    importance: 5,
    prerequisites: ["limits"],
    status: "not_started",
    source: "Week 3 notes · pp. 2–17",
    description: "Turn rates of change into a reliable set of rules, then use them to analyze behavior.",
    confidence: 20,
  },
  {
    id: "applications",
    title: "Derivative applications",
    shortTitle: "Applications",
    estimatedHours: 1,
    importance: 4,
    prerequisites: ["derivatives"],
    status: "not_started",
    source: "Problem set 3 · Q1–Q8",
    description: "Use derivatives to identify extrema, motion, and the shape of a graph.",
    confidence: 16,
  },
];

function starterNotes(): NotebookItem[] {
  return [
    {
      id: "note-bfs-recall",
      title: "BFS recall card",
      body: "BFS uses a queue. Mark a node when you enqueue it, process one distance layer at a time, and it gives shortest paths only when every edge has equal cost.",
      kind: "note",
      topicId: "bfs",
      sourceLabel: "Lecture 3 · pp. 7–13",
      createdAt: now(),
      pinned: true,
    },
    {
      id: "formula-graph-costs",
      title: "Graph complexity cues",
      body: "BFS / DFS: O(V + E). Dijkstra with a binary heap: O((V + E) log V). The right complexity depends on the graph representation and weight assumptions.",
      kind: "formula",
      topicId: "bfs",
      sourceLabel: "Lecture 3 · pp. 7–13",
      createdAt: now(),
    },
  ];
}

export function createDemoWorkspace(): Workspace {
  const dsa: Course = {
    id: "dsa-final",
    name: "Data Structures & Algorithms",
    shortName: "DSA final",
    color: "violet",
    deadline: daysFromToday(3),
    constraints: { days: 3, hoursPerDay: 2, prioritizedTopicIds: ["bfs", "shortest-paths", "dp"] },
    topics: dsaTopics,
    sources: [
      {
        id: "source-dsa-pdf",
        kind: "pdf",
        title: "DSA Final Revision Pack.pdf",
        detail: "42 pages · connected to the learning map",
        excerpt: "Graph traversal, shortest paths, spanning trees, and dynamic programming are emphasized in the final review material.",
      },
      {
        id: "source-dsa-video",
        kind: "youtube",
        title: "Graph algorithms review",
        detail: "YouTube · 26 min",
        url: "https://www.youtube.com/watch?v=example",
      },
    ],
    notes: starterNotes(),
    chat: [
      {
        id: "coach-welcome",
        role: "assistant",
        content: "I’m keeping your DSA plan prerequisite-safe. Start with BFS: it unlocks shortest paths, and you already have momentum there.",
        createdAt: now(),
        topicId: "bfs",
        sourceLabel: "Lecture 3 · pp. 7–13",
      },
    ],
    createdAt: now(),
  };

  const calculus: Course = {
    id: "calculus-midterm",
    name: "Calculus I",
    shortName: "Calc midterm",
    color: "cyan",
    deadline: daysFromToday(6),
    constraints: { days: 6, hoursPerDay: 1, prioritizedTopicIds: ["limits", "derivatives"] },
    topics: calculusTopics,
    sources: [
      {
        id: "source-calc-text",
        kind: "text",
        title: "Calculus midterm syllabus",
        detail: "Pasted syllabus · 4 topics mapped",
        excerpt: "Prioritize limits, derivative rules, and optimization applications.",
      },
    ],
    notes: [],
    chat: [
      {
        id: "calc-welcome",
        role: "assistant",
        content: "Your nearest calculus dependency is Limits → Derivatives. I’ll keep that path clear while preserving a small recovery buffer.",
        createdAt: now(),
        topicId: "limits",
      },
    ],
    createdAt: now(),
  };

  return { version: 1, activeCourseId: dsa.id, courses: [dsa, calculus] };
}

export function statusLabel(status: TopicStatus) {
  return status.replace("_", " ");
}

export function courseDeadlineLabel(deadline: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${deadline}T00:00:00`);
  const diff = Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
  if (diff < 0) return "deadline passed";
  if (diff === 0) return "due today";
  if (diff === 1) return "1 day left";
  return `${diff} days left`;
}

export function sourceKindLabel(kind: SourceKind) {
  return kind === "pdf" ? "PDF" : kind === "youtube" ? "YouTube" : kind === "text" ? "Text" : "Manual";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 36);
}

function titleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function cleanOutlineLine(value: string) {
  return value
    .replace(/^\s*(?:#{1,6}|[-*•]|\d+[.)])\s*/, "")
    .replace(/\s+/g, " ")
    .replace(/[.:;]+$/, "")
    .trim();
}

export function createTopicsFromOutline(courseName: string, rawOutline: string, sourceLabel: string): Topic[] {
  const lines = rawOutline
    .split(/\n|[•]/)
    .map(cleanOutlineLine)
    .filter((line) => line.length >= 3 && line.length <= 76)
    .filter((line, index, all) => all.indexOf(line) === index)
    .filter((line) => !/^(course|syllabus|week|exam|final|midterm|assessment)/i.test(line));

  const fallback = ["Foundations", "Core concepts", "Guided practice", "Applied problems", "Final review"];
  const candidates = (lines.length >= 3 ? lines : fallback).slice(0, 6);
  const usedIds = new Set<string>();

  return candidates.map((candidate, index) => {
    const title = candidate.length > 4 ? candidate : `${courseName} ${candidate}`;
    const baseId = slugify(title) || `topic-${index + 1}`;
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }
    usedIds.add(id);
    const prerequisiteIds = index === 0 ? [] : index === 1 || index === 2 ? [Array.from(usedIds)[0]] : [Array.from(usedIds)[index - 2]];
    return {
      id,
      title: titleCase(title),
      shortTitle: titleCase(title).split(" ").slice(0, 2).join(" "),
      estimatedHours: index === 0 ? 1 : index === candidates.length - 1 ? 1 : 2,
      importance: Math.max(3, 5 - (index % 3)),
      prerequisites: prerequisiteIds,
      status: index === 0 ? "in_progress" : "not_started",
      source: sourceLabel,
      description: `An editable draft topic from ${sourceLabel}. Add context, prerequisites, or a better estimate before you study it.`,
      confidence: index === 0 ? 45 : 20,
    };
  });
}

export function createCourseDraft(input: {
  name: string;
  deadline: string;
  days: number;
  hoursPerDay: number;
  source: CourseSource;
  rawOutline?: string;
}): Course {
  const courseId = slugify(input.name) || `course-${Date.now()}`;
  const topics = createTopicsFromOutline(input.name, input.rawOutline ?? "", input.source.title);
  return {
    id: `${courseId}-${Date.now().toString(36)}`,
    name: input.name.trim() || "Untitled course",
    shortName: input.name.trim().slice(0, 20) || "New course",
    color: "amber",
    deadline: input.deadline || daysFromToday(Math.max(1, input.days)),
    constraints: {
      days: Math.max(1, input.days),
      hoursPerDay: Math.max(1, input.hoursPerDay),
      prioritizedTopicIds: topics.slice(0, 3).map((topic) => topic.id),
    },
    topics,
    sources: [input.source],
    notes: [],
    chat: [
      {
        id: `welcome-${Date.now().toString(36)}`,
        role: "assistant",
        content: "I built an editable first-pass map from your material. Review the prerequisite links, then I’ll turn it into a study plan.",
        createdAt: now(),
        topicId: topics[0]?.id,
        sourceLabel: input.source.title,
      },
    ],
    createdAt: now(),
  };
}

export function localCoachReply(topic: Topic, query: string, course: Course) {
  const lowered = query.toLowerCase();
  const dependents = course.topics.filter((candidate) => candidate.prerequisites.includes(topic.id)).map((candidate) => candidate.shortTitle);
  const dependencyLine = dependents.length
    ? `Getting this clear unlocks ${dependents.join(" and ")} next.`
    : "This is a self-contained branch of your map, so you can use it as a confidence-building win.";

  if (lowered.includes("20") || lowered.includes("rescue") || lowered.includes("short")) {
    return `Here is the ${topic.shortTitle} rescue version: 5 minutes to state the idea in your own words, 10 minutes to trace one worked example, then 5 minutes to answer one retrieval question without notes. Stop after 20 minutes and mark your confidence honestly. ${dependencyLine}`;
  }
  if (lowered.includes("visual") || lowered.includes("diagram")) {
    return `${topic.shortTitle} is easiest to see as a flow: start from one known state, expose the next valid choice, and keep only the information you need to decide what comes next. Use the visual card beside this chat, then narrate one example aloud. ${dependencyLine}`;
  }
  if (lowered.includes("quiz") || lowered.includes("test")) {
    return `I queued a three-question recall check for ${topic.shortTitle}. Try it cold first; your explanation matters more than a lucky option pick. ${dependencyLine}`;
  }
  return `For ${topic.shortTitle}, begin with this anchor: ${topic.description ?? "name the core idea, then work one small example."} Work from ${topic.source}, pause after each step to ask what changes and why, then do a no-notes recall. ${dependencyLine}`;
}

export function formulaSheetForTopic(topic: Topic): NotebookItem {
  const key = topic.id;
  const bodies: Record<string, string> = {
    bfs: "Queue → mark when enqueued → process one distance layer at a time.\nTime: O(V + E) with an adjacency list.\nUse when every edge has equal cost; the first visit gives a shortest-edge-count path.",
    dfs: "Choose a neighbor → go deep → backtrack when stuck.\nTime: O(V + E) with an adjacency list.\nUse for reachability, components, cycle checks, and finishing-order reasoning.",
    "shortest-paths": "Dijkstra: initialize dist[start] = 0 → repeatedly choose the lowest tentative distance → relax outgoing edges.\nBinary heap: O((V + E) log V).\nDo not use with negative edge weights.",
    mst: "Kruskal: sort edges → add an edge only if it joins two different components.\nPrim: grow one connected tree through the cheapest crossing edge.\nA minimum spanning tree has V − 1 edges.",
    dp: "State = what changes. Transition = how a smaller answer creates this answer. Base cases anchor the table.\nAlways write: state, choice, recurrence, base case, iteration order.",
    limits: "lim x→a f(x) = L means f(x) can be made arbitrarily close to L by taking x close enough to a.\nCheck left and right limits before claiming a two-sided limit.",
    derivatives: "f′(x) = lim h→0 [f(x+h) − f(x)] / h.\nProduct: (fg)′ = f′g + fg′. Chain: d/dx f(g(x)) = f′(g(x))g′(x).",
  };
  const body = bodies[key] ?? `Definition: ${topic.description ?? topic.title}.\nMethod: identify the input, apply the governing rule, then check the result against a small example.\nRecall cue: explain why each step is allowed.`;
  return {
    id: `formula-${topic.id}-${Date.now().toString(36)}`,
    title: `${topic.shortTitle} — formula sheet`,
    body,
    kind: "formula",
    topicId: topic.id,
    sourceLabel: topic.source,
    createdAt: now(),
  };
}

export function visualExplanationForTopic(topic: Topic): NotebookItem {
  return {
    id: `visual-${topic.id}-${Date.now().toString(36)}`,
    title: `${topic.shortTitle} — visual explanation`,
    body: `Start with the known state → reveal one valid next move → record what changed → repeat until the goal condition is reached. For ${topic.shortTitle}, narrate the transition at each arrow rather than memorizing the finished picture.`,
    kind: "visual",
    topicId: topic.id,
    sourceLabel: topic.source,
    createdAt: now(),
  };
}

export function quizForTopic(topic: Topic): StudyQuiz {
  const templates: Record<string, StudyQuiz> = {
    bfs: {
      title: "BFS checkpoint",
      questions: [
        { prompt: "Which structure drives breadth-first search?", choices: ["Stack", "Queue", "Heap", "Set"], answer: 1, explanation: "A FIFO queue keeps the traversal moving one layer at a time." },
        { prompt: "When does BFS give a shortest path?", choices: ["Any weighted graph", "Only directed graphs", "When edges have equal cost", "Only trees"], answer: 2, explanation: "BFS minimizes number of edges, which matches cost only when edge costs are equal." },
        { prompt: "When should a node usually be marked visited?", choices: ["When it is enqueued", "After every neighbor", "Only at the end", "Never"], answer: 0, explanation: "Marking on enqueue prevents duplicate work and preserves clean layers." },
      ],
    },
    "shortest-paths": {
      title: "Shortest paths checkpoint",
      questions: [
        { prompt: "What operation improves a tentative route in Dijkstra’s algorithm?", choices: ["Rotate", "Relax", "Sort", "Merge"], answer: 1, explanation: "Relaxation tests whether a route through the current node improves a neighbor’s best known distance." },
        { prompt: "What edge weights break Dijkstra’s guarantee?", choices: ["Zero", "Integer", "Negative", "Equal"], answer: 2, explanation: "A later negative edge can invalidate a node that was treated as final." },
        { prompt: "What does the priority queue prioritize?", choices: ["Fewest neighbors", "Lowest tentative distance", "Largest degree", "Newest node"], answer: 1, explanation: "The next node selected is the smallest currently known tentative distance." },
      ],
    },
    dp: {
      title: "Dynamic programming checkpoint",
      questions: [
        { prompt: "What should a DP state capture?", choices: ["Every possible detail", "Only the information that changes future choices", "The final answer only", "The input order only"], answer: 1, explanation: "A good state is minimal but sufficient for the next transition." },
        { prompt: "What anchors a DP recurrence?", choices: ["A random example", "Base cases", "A loop variable", "A sort"], answer: 1, explanation: "Base cases provide the already-solved smallest subproblems." },
        { prompt: "Why does iteration order matter?", choices: ["It changes notation", "It ensures dependencies are computed first", "It removes base cases", "It avoids arrays"], answer: 1, explanation: "Each state must read answers that already exist." },
      ],
    },
  };
  return templates[topic.id] ?? {
    title: `${topic.shortTitle} checkpoint`,
    questions: [
      { prompt: `Which description best fits ${topic.shortTitle}?`, choices: ["A memorized label", "A core method you can explain and apply", "An unrelated definition", "A completed task"], answer: 1, explanation: "Aim to explain the method and use it on a small example." },
      { prompt: "What is the best next move after reading one worked example?", choices: ["Read it again", "Close the notes and reproduce the reasoning", "Skip practice", "Change the topic"], answer: 1, explanation: "Retrieval tells you what you can actually use without support." },
      { prompt: "What should you update after this checkpoint?", choices: ["Only the timer", "Your confidence signal", "Nothing", "The whole course"], answer: 1, explanation: "Confidence helps the planner protect the topics that need real recovery time." },
    ],
  };
}

export function readWorkspace(value: string | null): Workspace | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Workspace;
    if (parsed?.version !== 1 || !Array.isArray(parsed.courses) || !parsed.courses.length) return null;
    return parsed;
  } catch {
    return null;
  }
}
