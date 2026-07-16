export type TopicStatus = "not_started" | "in_progress" | "completed" | "struggling";

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

export type StudyBlock = {
  id: string;
  day: string;
  hour: string;
  topicId: string;
  label: string;
  kind: "learn" | "practice" | "review";
};

export const initialTopics: Topic[] = [
  { id: "graphs", title: "Graph fundamentals", shortTitle: "Graphs", estimatedHours: 1, importance: 5, prerequisites: [], status: "completed", source: "Lecture 3 · pp. 2–6" },
  { id: "bfs", title: "Breadth-first search", shortTitle: "BFS", estimatedHours: 1, importance: 5, prerequisites: ["graphs"], status: "in_progress", source: "Lecture 3 · pp. 7–13" },
  { id: "dfs", title: "Depth-first search", shortTitle: "DFS", estimatedHours: 1, importance: 4, prerequisites: ["graphs"], status: "not_started", source: "Lecture 3 · pp. 14–19" },
  { id: "shortest-paths", title: "Shortest paths", shortTitle: "Dijkstra", estimatedHours: 1, importance: 5, prerequisites: ["bfs"], status: "not_started", source: "Lecture 4 · pp. 3–11" },
  { id: "mst", title: "Minimum spanning trees", shortTitle: "MST", estimatedHours: 1, importance: 3, prerequisites: ["graphs"], status: "not_started", source: "Lecture 4 · pp. 12–18" },
  { id: "dp", title: "Dynamic programming", shortTitle: "DP", estimatedHours: 1, importance: 4, prerequisites: [], status: "not_started", source: "Lecture 5 · pp. 2–12" },
];

export const initialPlan: StudyBlock[] = [
  { id: "b1", day: "Today", hour: "5:00–6:00 PM", topicId: "bfs", label: "BFS: traversal & queue invariant", kind: "learn" },
  { id: "b2", day: "Today", hour: "6:15–7:15 PM", topicId: "dfs", label: "DFS: recursion & edge cases", kind: "practice" },
  { id: "b3", day: "Tomorrow", hour: "5:00–6:00 PM", topicId: "shortest-paths", label: "Dijkstra: relaxations", kind: "learn" },
  { id: "b4", day: "Tomorrow", hour: "6:15–7:15 PM", topicId: "dp", label: "DP: state transitions", kind: "learn" },
  { id: "b5", day: "Friday", hour: "5:00–6:00 PM", topicId: "mst", label: "MST: Kruskal & union-find", kind: "learn" },
  { id: "b6", day: "Friday", hour: "6:15–7:15 PM", topicId: "bfs", label: "Graphs: mixed review", kind: "review" },
];

export function replanAfterStruggle(plan: StudyBlock[]): StudyBlock[] {
  return plan.map((block) => {
    if (block.id === "b2") {
      return { ...block, topicId: "bfs", label: "BFS: guided practice & mini-check", kind: "practice" };
    }
    if (block.id === "b3") {
      return { ...block, topicId: "dfs", label: "DFS: recursion & edge cases", kind: "practice" };
    }
    if (block.id === "b5") {
      return { ...block, topicId: "shortest-paths", label: "Dijkstra: relaxations", kind: "learn" };
    }
    if (block.id === "b6") {
      return { ...block, topicId: "dp", label: "DP: essential patterns", kind: "learn" };
    }
    return block;
  });
}
