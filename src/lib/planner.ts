export type TopicStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "struggling";

export type Topic = {
  id: string;
  title: string;
  shortTitle: string;
  estimatedHours: number;
  importance: number;
  prerequisites: string[];
  status: TopicStatus;
  source: string;
};

export type PlannerConstraints = {
  days: number;
  hoursPerDay: number;
  prioritizedTopicIds: string[];
};

export type StudyBlock = {
  id: string;
  day: string;
  dayIndex: number;
  hour: string;
  topicId: string;
  label: string;
  kind: "learn" | "practice" | "review";
};

export type PlanResult = {
  blocks: StudyBlock[];
  selectedTopicIds: string[];
  deferredTopicIds: string[];
  coverage: number;
  capacityHours: number;
  scheduledHours: number;
  bufferHours: number;
  explanation: string;
  riskTopicId?: string;
  error?: string;
};

export const initialTopics: Topic[] = [
  {
    id: "graphs",
    title: "Graph fundamentals",
    shortTitle: "Graphs",
    estimatedHours: 1,
    importance: 5,
    prerequisites: [],
    status: "completed",
    source: "Lecture 3 · pp. 2–6",
  },
  {
    id: "bfs",
    title: "Breadth-first search",
    shortTitle: "BFS",
    estimatedHours: 1,
    importance: 5,
    prerequisites: ["graphs"],
    status: "in_progress",
    source: "Lecture 3 · pp. 7–13",
  },
  {
    id: "dfs",
    title: "Depth-first search",
    shortTitle: "DFS",
    estimatedHours: 1,
    importance: 4,
    prerequisites: ["graphs"],
    status: "not_started",
    source: "Lecture 3 · pp. 14–19",
  },
  {
    id: "shortest-paths",
    title: "Shortest paths",
    shortTitle: "Dijkstra",
    estimatedHours: 2,
    importance: 5,
    prerequisites: ["bfs"],
    status: "not_started",
    source: "Lecture 4 · pp. 3–11",
  },
  {
    id: "mst",
    title: "Minimum spanning trees",
    shortTitle: "MST",
    estimatedHours: 1,
    importance: 3,
    prerequisites: ["graphs"],
    status: "not_started",
    source: "Lecture 4 · pp. 12–18",
  },
  {
    id: "dp",
    title: "Dynamic programming",
    shortTitle: "DP",
    estimatedHours: 2,
    importance: 4,
    prerequisites: [],
    status: "not_started",
    source: "Lecture 5 · pp. 2–12",
  },
];

function topicHours(topic: Topic) {
  return topic.estimatedHours + (topic.status === "struggling" ? 1 : 0);
}

function validateCourseGraph(topics: Topic[]) {
  const byId = new Map<string, Topic>();

  for (const topic of topics) {
    if (byId.has(topic.id)) return `Duplicate topic id: ${topic.id}.`;
    if (!Number.isFinite(topic.estimatedHours) || topic.estimatedHours < 1) {
      return `${topic.shortTitle} needs an estimate of at least one hour.`;
    }
    byId.set(topic.id, topic);
  }

  for (const topic of topics) {
    for (const prerequisiteId of topic.prerequisites) {
      if (!byId.has(prerequisiteId)) return `${topic.shortTitle} has a missing prerequisite.`;
      if (prerequisiteId === topic.id) return `${topic.shortTitle} cannot depend on itself.`;
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (topicId: string): boolean => {
    if (visiting.has(topicId)) return true;
    if (visited.has(topicId)) return false;
    visiting.add(topicId);
    const topic = byId.get(topicId);
    const hasCycle = topic?.prerequisites.some(visit) ?? false;
    visiting.delete(topicId);
    visited.add(topicId);
    return hasCycle;
  };

  return topics.some((topic) => visit(topic.id)) ? "The learning map has a prerequisite cycle." : undefined;
}

function hasPrerequisite(topic: Topic, prerequisiteId: string, byId: Map<string, Topic>) {
  const visited = new Set<string>();
  const stack = [...topic.prerequisites];

  while (stack.length) {
    const nextId = stack.pop();
    if (!nextId || visited.has(nextId)) continue;
    if (nextId === prerequisiteId) return true;

    visited.add(nextId);
    const next = byId.get(nextId);
    if (next) stack.push(...next.prerequisites);
  }

  return false;
}

function topicUtility(topic: Topic, topics: Topic[], constraints: PlannerConstraints, byId: Map<string, Topic>) {
  const unlockValue = topics
    .filter((candidate) => hasPrerequisite(candidate, topic.id, byId))
    .reduce((total, candidate) => total + candidate.importance * 2, 0);
  const priorityBonus = constraints.prioritizedTopicIds.includes(topic.id) ? 20 : 0;
  const progressBonus = topic.status === "in_progress" ? 8 : topic.status === "struggling" ? 12 : 0;

  return topic.importance * 10 + unlockValue + priorityBonus + progressBonus;
}

function isValidSelection(selectedIds: Set<string>, byId: Map<string, Topic>) {
  for (const id of selectedIds) {
    const topic = byId.get(id);
    if (!topic) return false;

    for (const prerequisiteId of topic.prerequisites) {
      const prerequisite = byId.get(prerequisiteId);
      if (!prerequisite || (prerequisite.status !== "completed" && !selectedIds.has(prerequisiteId))) {
        return false;
      }
    }
  }

  return true;
}

function selectTopics(topics: Topic[], constraints: PlannerConstraints, byId: Map<string, Topic>) {
  const candidates = topics.filter((topic) => topic.status !== "completed");
  const capacityHours = Math.max(0, constraints.days * constraints.hoursPerDay);
  let bestIds = new Set<string>();
  let bestUtility = -1;
  let bestCoverage = -1;

  // Exact search is easy to inspect and safely covers the V1 learning map.
  // Future large courses can replace this with a branch-and-bound solver.
  if (candidates.length <= 16) {
    for (let mask = 0; mask < 2 ** candidates.length; mask += 1) {
      const selectedIds = new Set<string>();
      let hours = 0;
      let utility = 0;
      let coverage = 0;

      for (let index = 0; index < candidates.length; index += 1) {
        if ((mask & (1 << index)) === 0) continue;
        const topic = candidates[index];
        selectedIds.add(topic.id);
        hours += topicHours(topic);
        utility += topicUtility(topic, topics, constraints, byId);
        coverage += topic.importance;
      }

      if (hours > capacityHours || !isValidSelection(selectedIds, byId)) continue;
      if (utility > bestUtility || (utility === bestUtility && coverage > bestCoverage)) {
        bestIds = selectedIds;
        bestUtility = utility;
        bestCoverage = coverage;
      }
    }
  } else {
    // Deterministic fallback for a future expanded map. It still applies closure
    // before accepting a topic, so it cannot schedule an orphaned dependent.
    const ranked = [...candidates].sort(
      (a, b) => topicUtility(b, topics, constraints, byId) - topicUtility(a, topics, constraints, byId),
    );

    for (const topic of ranked) {
      const trial = new Set(bestIds);
      const addWithPrerequisites = (topicId: string) => {
        const current = byId.get(topicId);
        if (!current || current.status === "completed" || trial.has(topicId)) return;
        current.prerequisites.forEach(addWithPrerequisites);
        trial.add(topicId);
      };

      addWithPrerequisites(topic.id);
      const trialHours = [...trial]
        .map((topicId) => byId.get(topicId))
        .filter((candidate): candidate is Topic => Boolean(candidate))
        .reduce((total, candidate) => total + topicHours(candidate), 0);

      if (trialHours <= capacityHours && isValidSelection(trial, byId)) bestIds = trial;
    }
  }

  return bestIds;
}

function topologicalOrder(selectedIds: Set<string>, topics: Topic[], constraints: PlannerConstraints, byId: Map<string, Topic>) {
  const remaining = new Set(selectedIds);
  const order: Topic[] = [];

  while (remaining.size) {
    const ready = [...remaining]
      .map((id) => byId.get(id))
      .filter((topic): topic is Topic => Boolean(topic))
      .filter((topic) => topic.prerequisites.every((id) => !remaining.has(id)))
      .sort((a, b) => topicUtility(b, topics, constraints, byId) - topicUtility(a, topics, constraints, byId));

    if (!ready.length) break;
    const next = ready[0];
    remaining.delete(next.id);
    order.push(next);
  }

  return order;
}

function formatTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function dayLabel(dayIndex: number) {
  if (dayIndex === 0) return "Today";
  if (dayIndex === 1) return "Tomorrow";
  return `Day ${dayIndex + 1}`;
}

function blockLabel(topic: Topic, blockIndex: number, blockCount: number) {
  if (blockCount === 1) return `${topic.shortTitle}: core concepts`;
  if (blockIndex === 0) return `${topic.shortTitle}: learn the core model`;
  if (blockIndex === blockCount - 1) return `${topic.shortTitle}: practice & mini-check`;
  return `${topic.shortTitle}: guided practice`;
}

export function buildStudyPlan(topics: Topic[], constraints: PlannerConstraints): PlanResult {
  const capacityHours = Math.max(0, constraints.days * constraints.hoursPerDay);
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  const graphError = validateCourseGraph(topics);

  if (graphError) {
    const totalImportance = topics.reduce((total, topic) => total + topic.importance, 0);
    const completedImportance = topics
      .filter((topic) => topic.status === "completed")
      .reduce((total, topic) => total + topic.importance, 0);
    return {
      blocks: [],
      selectedTopicIds: [],
      deferredTopicIds: topics.filter((topic) => topic.status !== "completed").map((topic) => topic.id),
      coverage: totalImportance ? Math.round((completedImportance / totalImportance) * 100) : 0,
      capacityHours,
      scheduledHours: 0,
      bufferHours: capacityHours,
      explanation: `Plan paused: ${graphError}`,
      error: graphError,
    };
  }

  const selectedIds = selectTopics(topics, constraints, byId);
  const selectedOrder = topologicalOrder(selectedIds, topics, constraints, byId);
  const blocks: StudyBlock[] = [];
  let slotIndex = 0;

  selectedOrder.forEach((topic) => {
    const hours = topicHours(topic);
    for (let index = 0; index < hours; index += 1) {
      const dayIndex = Math.floor(slotIndex / constraints.hoursPerDay);
      const slotWithinDay = slotIndex % constraints.hoursPerDay;
      const start = 17 * 60 + slotWithinDay * 75;
      blocks.push({
        id: `${topic.id}-${index + 1}`,
        day: dayLabel(dayIndex),
        dayIndex,
        hour: `${formatTime(start)}–${formatTime(start + 60)}`,
        topicId: topic.id,
        label: blockLabel(topic, index, hours),
        kind: index === 0 ? "learn" : index === hours - 1 ? "practice" : "review",
      });
      slotIndex += 1;
    }
  });

  const deferredTopicIds = topics
    .filter((topic) => topic.status !== "completed" && !selectedIds.has(topic.id))
    .map((topic) => topic.id);
  const totalImportance = topics.reduce((total, topic) => total + topic.importance, 0);
  const coveredImportance = topics
    .filter((topic) => topic.status === "completed" || selectedIds.has(topic.id))
    .reduce((total, topic) => total + topic.importance, 0);
  const bufferHours = Math.max(capacityHours - blocks.length, 0);
  const deferredNames = deferredTopicIds.map((id) => byId.get(id)?.shortTitle).filter(Boolean);
  const selectedNames = selectedOrder.map((topic) => topic.shortTitle);

  const explanation = deferredNames.length
    ? `Kept ${selectedNames.join(", ")} in scope. ${deferredNames.join(", ")} is held out so prerequisites stay intact.`
    : bufferHours
      ? `All remaining topics fit. ${bufferHours}h is protected as a catch-up buffer.`
      : "All available hours are allocated to prerequisite-safe study blocks.";

  return {
    blocks,
    selectedTopicIds: [...selectedIds],
    deferredTopicIds,
    coverage: Math.round((coveredImportance / totalImportance) * 100),
    capacityHours,
    scheduledHours: blocks.length,
    bufferHours,
    explanation,
    riskTopicId: deferredTopicIds.find((id) => topics.some((topic) => topic.prerequisites.includes(id))) ?? deferredTopicIds[0],
  };
}
