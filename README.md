# StudyForge

StudyForge is an adaptive study operating system for deadline pressure. It turns course material, an editable prerequisite map, and the hours a learner actually has into a focused plan that explains every trade-off.

The product is fully usable in local-first mode: no account, database, or API key is required to try the DSA demo, create courses from an outline, plan work, replan, quiz yourself, or save learning artifacts.

## What is built

- A polished multi-course workspace with Today, Plan, Learning Map, Notebook, Progress, and Portfolio views.
- A focused “what should I do now?” study block with source context, rationale, completion, skip, and recovery actions.
- An editable, visible prerequisite DAG with cycle and missing-edge validation.
- A deterministic prerequisite-closed planner: it cannot schedule a dependent topic without every unfinished prerequisite in scope.
- Timeline and agenda plan views with availability controls, focus lenses, weighted coverage, buffers, deferrals, and plain-language explanations.
- Live, explainable replanning with a before/after coverage diff, moved blocks, deferred/added topics, prerequisite safety confirmation, and undo.
- Local persistence in browser storage, plus a resettable DSA + Calculus demo workspace.
- Course intake for pasted text, files, or public YouTube references; it creates an editable local map even when AI is unavailable.
- A contextual Forge Coach with source-aware local fallback, prompt chips, schedule-change proposal cards, and optional server-side OpenAI enhancement.
- Built-in visual explanation, formula sheet, 20-minute rescue plan, browser text-to-speech, mini-quizzes, and a searchable Course Notebook.
- Progress that separates completed work, scheduled coverage, confidence/mastery, at-risk topics, and recovery buffer.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional AI enhancement

Copy `.env.example` to `.env.local`, then add a server-side key:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-5
```

Without a key, StudyForge remains fully demoable through deterministic, local source-aware fallbacks. With a key, `/api/coach` and `/api/ingest` use the Responses API for contextual coaching and first-pass material extraction. Keys are never sent to the browser.

## Best demo flow

1. Open the seeded **DSA final** course: 3 days, 2 hours per day.
2. In **Learning Map**, trace Graphs → BFS → Dijkstra and inspect BFS’s source, mastery, prerequisites, and downstream unlock.
3. Return to **Today** and open the BFS visual explanation or 20-minute rescue plan.
4. Select **I need more time**. StudyForge protects recovery time, changes the plan, explains coverage impact, and identifies what moved or deferred.
5. Use **Undo change** to restore the prior plan.
6. Take the BFS quiz and save the result to the **Course Notebook**.
7. Use **New course** to paste an outline; inspect and edit the generated map before studying it.
8. Open **Portfolio** to compare active courses and deadlines without mixing their prerequisite paths.

## Architecture

| Layer | Responsibility |
| --- | --- |
| `src/lib/planner.ts` | Graph validation, prerequisite closure, deterministic selection, topological scheduling, coverage/mastery metrics |
| `src/lib/studyforge.ts` | Course, source, notebook, quiz, local coach, local intake, and persistence-domain helpers |
| `src/components/studyforge-app.tsx` | The complete client workspace, interactions, accessibility states, and local persistence |
| `src/app/api/coach/route.ts` | Optional source-grounded OpenAI coaching boundary |
| `src/app/api/ingest/route.ts` | Optional file/text-assisted learning-map extraction boundary |
| `src/lib/openai.ts` | Server-only Responses API request helper; never exposes the API key client-side |

## Verification

```bash
npx tsc --noEmit
npm run lint
npm run build
```

The build validates the static app plus dynamic AI endpoints. The app is designed with keyboard-focus states, semantic buttons/dialogs, live replan notices, 44px-ish primary controls, and reduced-motion handling.

## Product boundaries

StudyForge intentionally keeps one thing deterministic: schedules and prerequisite safety. AI is used only for material extraction and tutoring assistance; a model never silently rearranges a course plan or bypasses a learning dependency.
