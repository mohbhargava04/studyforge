import assert from "node:assert/strict";
import test from "node:test";
import { buildStudyPlan, validateCourseGraph, type Topic } from "../src/lib/planner.ts";

function topic(overrides: Partial<Topic> & Pick<Topic, "id" | "title">): Topic {
  return {
    shortTitle: overrides.title,
    estimatedHours: 1,
    importance: 3,
    prerequisites: [],
    status: "not_started",
    source: "Test source",
    ...overrides,
  };
}

test("selecting a dependent includes its unfinished prerequisite closure", () => {
  const topics = [
    topic({ id: "foundation", title: "Foundation", status: "completed", importance: 4 }),
    topic({ id: "bfs", title: "BFS", importance: 5, prerequisites: ["foundation"] }),
    topic({ id: "dijkstra", title: "Dijkstra", importance: 5, prerequisites: ["bfs"] }),
    topic({ id: "distraction", title: "Distraction", importance: 2, estimatedHours: 2 }),
  ];
  const plan = buildStudyPlan(topics, { days: 1, hoursPerDay: 2, prioritizedTopicIds: ["dijkstra"] });

  assert.deepEqual(new Set(plan.selectedTopicIds), new Set(["bfs", "dijkstra"]));
  assert.deepEqual(plan.blocks.map((block) => block.topicId), ["bfs", "dijkstra"]);
  assert.equal(plan.deferredTopicIds.includes("distraction"), true);
});

test("a recovery request adds exactly one focused hour and preserves its dependent path", () => {
  const topics = [
    topic({ id: "foundation", title: "Foundation", status: "completed", importance: 4 }),
    topic({ id: "bfs", title: "BFS", status: "struggling", importance: 5, prerequisites: ["foundation"] }),
    topic({ id: "dijkstra", title: "Dijkstra", importance: 5, prerequisites: ["bfs"] }),
    topic({ id: "review", title: "Review", importance: 2, estimatedHours: 2 }),
  ];
  const plan = buildStudyPlan(topics, { days: 1, hoursPerDay: 3, prioritizedTopicIds: ["bfs", "dijkstra"] });

  assert.equal(plan.blocks.filter((block) => block.topicId === "bfs").length, 2);
  assert.equal(plan.selectedTopicIds.includes("dijkstra"), true);
  assert.equal(plan.selectedTopicIds.includes("review"), false);
});

test("a prerequisite cycle pauses scheduling with an inspectable explanation", () => {
  const topics = [
    topic({ id: "a", title: "A", prerequisites: ["b"] }),
    topic({ id: "b", title: "B", prerequisites: ["a"] }),
  ];
  const plan = buildStudyPlan(topics, { days: 2, hoursPerDay: 2, prioritizedTopicIds: [] });

  assert.equal(validateCourseGraph(topics), "The learning map has a prerequisite cycle.");
  assert.equal(plan.blocks.length, 0);
  assert.match(plan.explanation, /cycle/i);
});

test("completed coverage stays distinct from scheduled coverage", () => {
  const topics = [
    topic({ id: "done", title: "Done", status: "completed", importance: 2 }),
    topic({ id: "next", title: "Next", importance: 5 }),
  ];
  const plan = buildStudyPlan(topics, { days: 1, hoursPerDay: 1, prioritizedTopicIds: ["next"] });

  assert.equal(plan.completedCoverage, 29);
  assert.equal(plan.scheduledCoverage, 71);
  assert.equal(plan.coverage, 100);
});
