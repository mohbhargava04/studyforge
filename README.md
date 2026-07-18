# StudyForge

StudyForge is an adaptive, chat-first study planner. It turns a course topic map, prerequisite relationships, and a student's available time into an explainable hourly plan—and recalculates that plan when the student falls behind.

This repository currently contains a polished, local-first Build Week prototype using a seeded DSA course.

## What works now

- An inspectable topic and prerequisite map
- A deterministic planner that selects a prerequisite-closed set of topics within a time budget
- Hour-by-hour blocks in topological (prerequisite-safe) order
- Adjustable days, study hours, topic estimates, and subject focus
- Live re-planning when a topic is completed or needs more time
- Coverage, deferred-topic, and recovery-buffer explanations
- Contextual study-block interface ready for source-grounded AI chat

The planner uses exact subset search for the build-week-sized course map (up to 16 unfinished topics). A selected dependent must include every unfinished prerequisite, so it cannot schedule Dijkstra without BFS. Larger maps use a deterministic dependency-aware fallback.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo flow

1. Start with the default 3 days × 2 hours plan.
2. Select **BFS**, then choose **I need more time**.
3. StudyForge adds a practice hour, re-optimizes future blocks, and shows the weighted-coverage trade-off.
4. Reduce the number of days or change focus to see the plan retain valid prerequisite paths.

## Architecture

| Layer | Responsibility |
| --- | --- |
| `src/lib/planner.ts` | Course graph validation, prerequisite closure, deterministic selection, topological allocation, coverage calculation |
| `src/app/page.tsx` | Interactive study workspace and plan controls |
| Future AI layer | Material extraction, source-grounded explanations, mini-quizzes, and natural-language plan actions |

## Next build milestones

1. Persist courses, topics, blocks, and progress in Supabase.
2. Add PDF or YouTube transcript ingestion and structured topic extraction.
3. Make the learning map fully editable (nodes and prerequisite edges).
4. Add an OpenAI-backed contextual block chat and mastery checks.
5. Deploy to Vercel and record the Build Week demo.
