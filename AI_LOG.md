# AI Log

## 2026-04-13

**Tool:** Claude

**What I asked for:**
Build Day 1 of BlockNote only: PERN stack, working auth, PostgreSQL schema, document list, and a repo structure that can support later editor milestones.

**What it generated:**
A monorepo with Express + Prisma backend, React + TypeScript frontend, JWT auth with refresh cookies, and a document dashboard for authenticated users.

**What was wrong or missing:**
There were some unneeded frontend blocks added which were not needed. The landing page had both login and register together. 

**What I changed and why:**
I made a different display for register and login in the landing page as it made it look more organized. 

## 2026-04-14

**Tool:** ChatGPT / Codex

**What I asked for:**
Keep the folder structure ready for upcoming days instead of building a one-off dashboard.

**What it generated:**
Separate `backend/src/controllers`, `services`, `middleware`, `routes`, and `frontend/src/features`, `api`, `store`, `components`, and `hooks` folders.

**What was wrong or missing:**
Nothing fundamentally wrong, but I reviewed the layout to make sure the future editor, blocks API, share routes, and autosave logic can be added without moving files later.

**What I changed and why:**
I kept the structure modular and intentionally included the `Block` Prisma model on Day 1 so later milestones can extend behavior without database redesign.

## 2026-04-15

**Tool:** Claude

**What I asked for:**
Asked to add new functionalities like word count, pin documents and some fixes in block behavior.

**What it generated:**
Generated most of the things correctly as I said.

**What was wrong or missing:**
The / dropdown menu was corrupted. Selection after slash was going down to next line instead of that line. 

**What I changed and why:**
I changed the slashSelectingRef = useRef(false) because this stopped adding the new block in next line. AI didn't look for this root reason so I debugged this. 



## 2026-04-15

**Tool:** Claude, Stitch

**What I asked for:**
Generate implementation prompts and guidance for adding paraphrasing, grammar check, summarization and UI enhancements to the BlockNote application.

**What it generated:**
Structured AI prompts and integration strategies using the Gemini API, along with recommendations for a modern, responsive, and Notion-inspired UI.

**What was wrong or missing:**
Some buttons were not working as expected. Also the replace paraphrased or correct grammar was going into wrong blocks.

**What I changed and why:**
I changed the button onClick events. Removed some unnecessary blocks which were added by AI.

## 2026-04-16

**Tool:** Claude (Copilot)

**What I asked for:**
Implement CSRF protection with double-submit cookie pattern and enforce read-only access on shared documents.

**What it generated:**
Created `csrf.middleware.ts` with double-submit validation (hash comparison), implemented `document-ownership.middleware.ts` to restrict POST/PUT/DELETE to document owner, and removed `accessToken` from JSON responses—now stored in HttpOnly secure cookie.

**What was wrong or missing:**
Initial CSRF implementation used SameSite=None which was vulnerable. Ownership middleware needed to exclude GET requests for shared document viewing.

**What I changed and why:**
Refined CSRF to use SameSite=Strict with fallback to double-submit validation, ensuring CSRF tokens are injected via `axios.interceptors.response` in frontend. This locked down state-changing operations without breaking shared document read flows.

---

**Tool:** Claude (Copilot)

**What I asked for:**
Add delete buttons to ALL block types and fix heading Enter behavior to preserve heading level instead of creating paragraphs.

**What it generated:**
Added `<DeleteButton>` component to all 6 block types in `block-component.tsx`. Modified `handleEnter()` in `block-editor.tsx` to detect heading type and create `heading_1` or `heading_2` instead of always creating paragraph.

**What was wrong or missing:**
Initially only text blocks had delete buttons visible; some heading levels were mapping to wrong block types (h3+ → heading_2 instead of heading_1).

**What I changed and why:**
Standardized delete button visibility across all blocks and added explicit heading level detection with `headingMatch[1].length === 1 ? "heading_1" : "heading_2"` logic. This ensures consistent heading behavior and uniform delete affordance.

## 2026-04-17

**Tool:** Claude (Copilot)

**What I asked for:**
Enable the toolbar to work on AI-generated content by ensuring markdown formatting (**bold**, *italic*, `code`, links) is converted to proper semantic HTML tags.

**What it generated:**
Identified that `handleAIApply()` in `block-editor.tsx` was using `textToHtml()` for plain-text content instead of `markdownInlineToHtml()`, causing inline markdown to remain as plain text and preventing toolbar detection.

**What was wrong or missing:**
The markdown detection regex only checked for structural patterns (headings, lists, code blocks) but missed inline-only formatting. When AI returned "This is **bold** text," it took the plain-text path and skipped markdown conversion entirely.

**What I changed and why:**
Changed line 411 from `html: textToHtml(chunk)` to `html: markdownInlineToHtml(chunk)` in the plain-text insertion path. Now ALL AI content—whether structural or inline-only—gets full markdown-to-HTML conversion. Tested with 6 test cases: **bold** → `<strong>`, *italic* → `<em>`, `code` → `<code>`, links → `<a>`. Result: **100% working toolbar on AI-generated content.** Build successful: 0 TypeScript errors (frontend + backend).
