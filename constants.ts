import { FunctionDeclaration, Type } from "@google/genai";
import { WorkoutLog } from "./types";

export const MODEL_NAME = "gemini-3-pro-preview";

export const SYSTEM_INSTRUCTION = `You are **Biome: The AI Performance Coach**, an elite, data-driven strength and conditioning specialist. Your sole purpose is to maximize the user's progress through **Progressive Overload** while prioritizing safety, optimal technique, and longevity. You use biomimicry principles to guide training.

**YOUR CORE MISSION & GOAL:**
1.  **Analyze** the user's historical training data.
    *   **Specific:** If the user names an exercise, use 'get_history' and 'calculate_metrics'.
    *   **Global/General:** If the user asks "How am I doing?", "Analyze my poor workouts", "Overview", or "What should I work on?", you **MUST** use the 'get_overall_statistics' tool to scan the entire database. Look for exercises marked "REGRESSING" or "PLATEAU", or those with high average RPE (>9) but low progress.
2.  **Diagnose** the current training trend (e.g., Progressing, Plateauing, Over-fatigued, Form Breakdown).
3.  **Generate** a highly personalized, actionable workout prescription.
4.  **Log** new data when the user reports a completed set or session.
5.  **Suggest Alternatives:** If a user is injured, stalling, or bored, use the 'get_exercise_knowledge' tool.

**CONSTRAINTS & RULES:**
* **Tool-First Rule:** You **MUST** use the provided tools to retrieve and analyze data before forming an opinion.
* **Knowledge Check:** When suggesting a new exercise or a substitute, use 'get_exercise_knowledge'.
* **Visualization Guarantee:** If the user provides training logs in the chat, you **MUST** use the 'log_workout' tool to save EVERY entry to the database immediately.
* **Data Normalization:** Internally resolve the exercise name to a standard English name (e.g., 'Agachamento' -> 'Squat').
* **RPE Interpretation:**
    * **RPE 6-7:** Too easy. Recommend increasing volume/weight.
    * **RPE 8-9:** Optimal Zone.
    * **RPE 9.5-10:** Near/Absolute Failure. If performance is dropping, recommend Deload.
* **Output Format:** Start with a bolded directive (e.g., **"Biome Protocol: Initiate Load Increase"**), followed by Analysis, then Prescription.

**STYLE:** Professional, analytical, authoritative, and focused on biomechanical efficiency.`;

// --- Mock Database (Initial Seed) ---

export const MOCK_DATABASE: Record<string, WorkoutLog[]> = {
  "Bulgarian Squat": [
    { date: "2025-10-15", weight: 16, reps: 10, rpe: 8, notes: "Good form, felt strong." },
    { date: "2025-10-22", weight: 18, reps: 10, rpe: 8.5, notes: "Increased weight, smooth." },
    { date: "2025-11-05", weight: 20, reps: 8, rpe: 9, notes: "Heavy, knee wobble on last rep." },
    { date: "2025-11-15", weight: 20, reps: 10, rpe: 9.5, notes: "Grinded out the last two." },
    { date: "2025-11-28", weight: 20, reps: 12, rpe: 10, notes: "I relax when it gets hard, extreme fatigue" }
  ],
  "Squat": [
    { date: "2025-11-01", weight: 100, reps: 5, rpe: 8, notes: "Solid." },
    { date: "2025-11-20", weight: 105, reps: 5, rpe: 9, notes: "Hard." }
  ],
  "Bench Press": [
    { date: "2025-09-10", weight: 80, reps: 8, rpe: 7, notes: "Easy start." },
    { date: "2025-09-25", weight: 85, reps: 8, rpe: 8, notes: "Good tempo." },
    { date: "2025-10-10", weight: 90, reps: 6, rpe: 8.5, notes: "Heavy but solid." },
    { date: "2025-10-24", weight: 92.5, reps: 5, rpe: 9, notes: "Struggle on lock out." },
    { date: "2025-11-15", weight: 95, reps: 4, rpe: 9.5, notes: "Near failure." },
    { date: "2025-12-01", weight: 95, reps: 5, rpe: 10, notes: "Absolute max effort." }
  ],
  "Dead Hang": [
    { date: "2025-11-01", weight: 0, reps: 60, rpe: 7, notes: "Bodyweight, 60s" },
    { date: "2025-11-08", weight: 5, reps: 45, rpe: 8, notes: "Bodyweight + 5kg, 45s" },
    { date: "2025-11-15", weight: 10, reps: 30, rpe: 9, notes: "Bodyweight + 10kg, 30s" }
  ]
};

// --- Tool Definitions ---

export const getHistoryTool: FunctionDeclaration = {
  name: "get_history",
  description: "Fetches the complete historical workout log for a single, specific exercise.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      exercise_name: {
        type: Type.STRING,
        description: "The standardized English name of the exercise.",
      },
    },
    required: ["exercise_name"],
  },
};

export const getOverallStatisticsTool: FunctionDeclaration = {
  name: "get_overall_statistics",
  description: "Fetches a high-level summary of ALL exercises in the database. Use this for general queries like 'How am I doing?', 'Analyze my data', or 'Identify poor workouts'. Returns trends, consistency, and status for each exercise.",
  parameters: {
    type: Type.OBJECT,
    properties: {}, // No parameters needed
  },
};

export const calculateMetricsTool: FunctionDeclaration = {
  name: "calculate_metrics",
  description: "Processes the raw history data to calculate key performance indicators (KPIs). Must be called after get_history.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      history_data: {
        type: Type.STRING,
        description: "The raw, JSON-formatted data returned immediately from the get_history tool call.",
      },
    },
    required: ["history_data"],
  },
};

export const logWorkoutTool: FunctionDeclaration = {
  name: "log_workout",
  description: "Saves a new workout entry to the database. REQUIRED if the user provides data so it can be visualized.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      exercise_name: {
        type: Type.STRING,
        description: "The standardized English name of the exercise.",
      },
      weight: {
        type: Type.NUMBER,
        description: "Weight lifted in kg.",
      },
      reps: {
        type: Type.NUMBER,
        description: "Number of repetitions performed.",
      },
      rpe: {
        type: Type.NUMBER,
        description: "Rate of Perceived Exertion (1-10).",
      },
      notes: {
        type: Type.STRING,
        description: "Qualitative notes about form, feeling, or pain.",
      },
      date: {
        type: Type.STRING,
        description: "Date of the workout in YYYY-MM-DD format. Defaults to today if not specified.",
      }
    },
    required: ["exercise_name", "weight", "reps", "rpe"],
  },
};

export const getExerciseKnowledgeTool: FunctionDeclaration = {
  name: "get_exercise_knowledge",
  description: "Retrieves biomechanical metadata about an exercise, including regressions (easier), progressions (harder), and alternatives.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      exercise_name: {
        type: Type.STRING,
        description: "The standardized English name of the exercise.",
      },
    },
    required: ["exercise_name"],
  },
};