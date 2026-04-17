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

**Tool:** Codex

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

---

## Architecture Deep-Dives (Manual Implementation Decisions)

### 1. Enter Mid-Block Split Implementation

**What the AI provided:**
Claude generated the initial `handleEnter()` function that splits a contenteditable block at the cursor position. It understood the concept of splitting into "before" and "after" HTML fragments and creating a new block. The implementation correctly used `splitHTMLAtCaret()` to extract text at both sides of the caret.

**What Claude got right:**
- Proper state management using React hooks (`setBlocks` callback)
- Sorting blocks by `orderIndex` before finding the target block
- Using `requestAnimationFrame` to defer DOM updates (good for rendering performance)
- Preserving the current block's type when creating a new block from Enter in headings

**What I wrote manually instead of AI:**
The logic to **preserve heading type on Enter**. Claude initially defaulted all new blocks to `paragraph`, but I changed it to:
```typescript
const newBlockType = (current.type === "heading_1" || current.type === "heading_2") ? current.type : "paragraph";
```
**Why:** When a user presses Enter while editing a heading, they expect the new line to also be a heading, not suddenly switch to paragraph. This is standard Notion-like editor behavior. Claude's template was too generic for semantic block types.

**Additional manual call:** The `beforeHTML` and `afterHTML` extraction before the Enter handler runs. Claude didn't handle the complex HTML parsing correctly for preserving inline formatting (`<strong>`, `<em>`, `<code>` within the split), so I manually audited the `splitHTMLAtCaret()` function to ensure it uses DOM Range API correctly.

### 2. Order Index

**What the AI provided:**
Claude suggested using a simple integer sequencing system (0, 1, 2, 3...) for ordering blocks, which is how many simple editors work.

**Why I rejected it:**
Integer sequencing breaks when you insert a block in the middle repeatedly. Example:
- Initial: BlockA (index 0), BlockB (index 1)
- Insert between them: BlockA (0), BlockC (needs 0.5), BlockB (1)
- Insert again: BlockA (0), BlockD (needs 0.25), BlockC (0.5), BlockB (1)

Eventually we run out of precision. 

**What I implemented manually:**
A `reindex()` function that detects when gaps become too small (`< 0.001`) and rewrites all indices to clean multiples of 1000:
```typescript
if (sorted[i].orderIndex - sorted[i - 1].orderIndex < 0.001) { 
  return sorted.map((b, i) => ({ ...b, orderIndex: (i + 1) * 1000 }));
}
```
**Why this matters:** Floating-point precision degrades after ~15 decimal places. Without reindexing, after 50+ insertions in the same location, you'd hit JavaScript's number precision limits and blocks could be out of order.

**Database schema decision:**
I deliberately used `Float` type in Prisma (`orderIndex Float`) instead of `Int` because Claude's default schema used integers. PostgreSQL's `FLOAT` gives us 15 significant digits of precision—enough for the reindexing approach to handle realistic editing scenarios.

### 3. Cross-Account Document Protection

**What the AI provided:**
Claude generated basic authentication middleware (`requireAuth`) that verified JWT tokens. However, it didn't prevent authenticated User A from modifying User B's documents.

**The vulnerability Claude missed:**
A simple endpoint like `PATCH /api/documents/:id` with just `requireAuth` would let any authenticated user modify any document by changing the ID. This is a classic **horizontal privilege escalation** attack.

**What I implemented manually — `enforceDocumentOwnership` middleware:**
I wrote a dedicated middleware that runs on ALL write operations (POST, PUT, PATCH, DELETE) to check document ownership.

**Why this was essential:**
- **GET excluded:** Shared documents allow read-only access via share tokens, so we only check ownership on writes.
- **Applied to all block routes:** Even deleting a single block verifies the document owner.
- **Defensive coding:** Just because a user is authenticated doesn't mean they should access everything. Always verify resource ownership.

**Additional protection I added:**
The database relationships themselves: `Document` has `userId` with `CASCADE` delete, and `Block` has `documentId` with `CASCADE` delete. This enforces referential integrity at the schema level—orphaned blocks can't exist.

### 4. Manual Code vs. AI-Generated: Decision Patterns

**When I wrote code manually instead of using AI output:**

#### A. Block Type Logic (Headings, Todos, Dividers)
Claude's initial implementation treated all blocks as generic `content` with a `type` property. But in practice:
- Headings need **type-aware Enter behavior** (create same level heading, not paragraph)
- Todos need **checked state** alongside HTML content
- Dividers and images have **no text content**—only metadata

I manually created the `BlockContent` type union to enforce these constraints.
**Why:** This prevents runtime errors like "why is my divider's HTML not saving?" or "my code block lost its newlines." Type safety catches bugs before they reach production.

#### B. Fractional Ordering 
AI's integer system was fundamentally flawed for this use case. I had to research and implement a proven pattern.

#### C. Markdown Parsing 
Claude generated a good markdown parser, but I manually reviewed and hardened it:
- Added table divider detection to prevent incorrectly parsing markdown tables as blocks
- Fixed regex escaping for edge cases
- Ensured all markdown patterns (headings, lists, code blocks) were correctly detected
- **Fine detail:** Made sure bullet points are converted to `<p>• ${text}</p>` instead of creating literal bullet blocks, which isn't part of BlockNote's model

#### D. CSRF Double-Submit Cookie Pattern
Claude generated basic CSRF middleware, but I manually implemented the **double-submit** strategy.

**Why manual:** This pattern requires careful coordination between backend and frontend. Claude could suggest it, but the implementation details (hashing algorithm, timing, when to rotate tokens) needed domain security knowledge.

### Summary: AI Strengths vs. Manual Insights

**AI excelled at:**
- Initial boilerplate and scaffolding
- Connecting middleware chains
- React component structure
- Type definitions
- Error handling patterns

**Manual work was essential for:**
- Data structure design 
- Algorithm choices
- Security enforcement 
- Edge case handling 
- Semantic correctness 

**Lesson:** AI is a code generator, not an architect. It excels at implementing designed patterns but struggles with foundational design decisions. The best workflow: I design the system (what blocks need, how ordering should work, what security looks like), then AI implements the scaffolding, then I harden and integrate the pieces.


