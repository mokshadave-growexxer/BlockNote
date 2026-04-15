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



## **2026-04-15**

**Tool:** Claude, Stitch

**What I asked for:**
Generate implementation prompts and guidance for adding paraphrasing, grammar check, summarization and UI enhancements to the BlockNote application.

**What it generated:**
Structured AI prompts and integration strategies using the Gemini API, along with recommendations for a modern, responsive, and Notion-inspired UI.

**What was wrong or missing:**
Some buttons were not working as expected. Also the replace paraphrased or correct grammar was going into wrong blocks.

**What I changed and why:**
I changed the button onClick events. Removed some unnecessary blocks which were added by AI.
