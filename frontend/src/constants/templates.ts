import type { BlockType, BlockContent } from "../features/editor/types";

export interface TemplateBlock {
  type: BlockType;
  content: BlockContent;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultTitle: string;
  blocks: TemplateBlock[];
}

function today(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const TEMPLATES: Template[] = [
  // ── 1. Blank ─────────────────────────────────────────────────────
  {
    id: "blank",
    name: "Blank Document",
    description: "Start with a clean slate",
    icon: "📄",
    defaultTitle: "Untitled Document",
    blocks: [
      { type: "paragraph", content: { html: "" } },
    ],
  },

  // ── 2. Meeting Notes ──────────────────────────────────────────────
  {
    id: "meeting-notes",
    name: "Meeting Notes",
    description: "Structured notes with agenda and action items",
    icon: "📋",
    defaultTitle: "Meeting Notes",
    blocks: [
      { type: "heading_1", content: { html: "Meeting Notes" } },
      { type: "paragraph", content: { html: `Date: ${today()}` } },
      { type: "heading_2", content: { html: "Attendees" } },
      { type: "todo", content: { html: "Participant 1", checked: false } },
      { type: "todo", content: { html: "Participant 2", checked: false } },
      { type: "heading_2", content: { html: "Agenda" } },
      { type: "paragraph", content: { html: "Discuss project updates." } },
      { type: "paragraph", content: { html: "Review open action items." } },
      { type: "heading_2", content: { html: "Action Items" } },
      { type: "todo", content: { html: "Follow up on tasks", checked: false } },
      { type: "todo", content: { html: "Schedule next meeting", checked: false } },
    ],
  },

  // ── 3. To-Do List ─────────────────────────────────────────────────
  {
    id: "todo-list",
    name: "To-Do List",
    description: "A simple checklist to track tasks",
    icon: "✅",
    defaultTitle: "To-Do List",
    blocks: [
      { type: "heading_1", content: { html: "To-Do List" } },
      { type: "todo", content: { html: "Task 1", checked: false } },
      { type: "todo", content: { html: "Task 2", checked: false } },
      { type: "todo", content: { html: "Task 3", checked: false } },
      { type: "todo", content: { html: "Task 4", checked: false } },
      { type: "todo", content: { html: "Task 5", checked: false } },
    ],
  },

  // ── 4. Project Planner ────────────────────────────────────────────
  {
    id: "project-planner",
    name: "Project Planner",
    description: "Overview, timeline, and resources for a project",
    icon: "📘",
    defaultTitle: "Project Planner",
    blocks: [
      { type: "heading_1", content: { html: "Project Planner" } },
      { type: "heading_2", content: { html: "Overview" } },
      { type: "paragraph", content: { html: "Describe the project goals and scope here." } },
      { type: "heading_2", content: { html: "Timeline" } },
      { type: "todo", content: { html: "Phase 1 — Planning", checked: false } },
      { type: "todo", content: { html: "Phase 2 — Execution", checked: false } },
      { type: "todo", content: { html: "Phase 3 — Review", checked: false } },
      { type: "heading_2", content: { html: "Resources" } },
      { type: "paragraph", content: { html: "List team members, tools, and links here." } },
    ],
  },

  // ── 5. Daily Journal ─────────────────────────────────────────────
  {
    id: "daily-journal",
    name: "Daily Journal",
    description: "Reflect on your day and set goals",
    icon: "📓",
    defaultTitle: "Daily Journal",
    blocks: [
      { type: "heading_1", content: { html: "Daily Journal" } },
      { type: "paragraph", content: { html: `Date: ${today()}` } },
      { type: "heading_2", content: { html: "Reflections" } },
      { type: "paragraph", content: { html: "What went well today?" } },
      { type: "paragraph", content: { html: "What could have been better?" } },
      { type: "heading_2", content: { html: "Goals for Tomorrow" } },
      { type: "todo", content: { html: "Goal 1", checked: false } },
      { type: "todo", content: { html: "Goal 2", checked: false } },
      { type: "todo", content: { html: "Goal 3", checked: false } },
    ],
  },

  // ── 6. Code Notes ─────────────────────────────────────────────────
  {
    id: "code-notes",
    name: "Code Notes",
    description: "Document code snippets with explanations",
    icon: "💻",
    defaultTitle: "Code Notes",
    blocks: [
      { type: "heading_1", content: { html: "Code Notes" } },
      { type: "paragraph", content: { html: "Topic: " } },
      { type: "heading_2", content: { html: "Snippet" } },
      { type: "code", content: { text: "// Write your code here\n" } },
      { type: "heading_2", content: { html: "Explanation" } },
      { type: "paragraph", content: { html: "Explain what the code does here." } },
      { type: "heading_2", content: { html: "References" } },
      { type: "paragraph", content: { html: "Add links or references here." } },
    ],
  },
];
