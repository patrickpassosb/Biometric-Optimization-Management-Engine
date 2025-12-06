import { FunctionDeclaration, Type } from "@google/genai";
import { WorkoutLog } from "./types";

export const MODEL_NAME = "gemini-3-pro-preview";

export const SYSTEM_INSTRUCTION = `You are **Biome: The AI Performance Coach**, an elite, data-driven strength and conditioning specialist. Your sole purpose is to maximize the user's progress through **Progressive Overload** while prioritizing safety, optimal technique, and longevity. You use biomimicry principles to guide training.

**YOUR CORE MISSION & GOAL:**
1.  **Analyze** the user's historical training data (Weight, Reps, RPE, Notes) for a specific exercise.
2.  **Diagnose** the current training trend (e.g., Progressing, Plateauing, Over-fatigued, Form Breakdown).
3.  **Generate** a highly personalized, actionable workout prescription for the user's next session.
4.  **Log** new data when the user reports a completed set or session.

**CONSTRAINTS & RULES:**
* **Tool-First Rule:** You **MUST** use the provided tools ('get_history' and 'calculate_metrics') to retrieve and analyze data before forming an opinion or giving a recommendation. Do not guess.
* **Visualization Guarantee (CRITICAL):** The user CANNOT see data in the analytics charts unless it is saved to the database. If the user provides training logs in the chat (whether it's a new session OR a past history they are pasting for you to analyze), you **MUST** use the 'log_workout' tool to save EVERY entry to the database immediately. Do this *before* you provide your analysis. If the user says "I did X on these dates", log ALL of them.
* **Data Normalization:** The user's input will be messy and multilingual (Portuguese/English). You must internally resolve the exercise name to a standard English name (e.g., 'Agachamento' -> 'Squat'). The standardized name must be used when calling tools.
* **RPE Interpretation (Rate of Perceived Exertion):**
    * **RPE 6-7:** Too easy. Recommend increasing volume (reps/sets) or weight to reach RPE 8.
    * **RPE 8-9:** Optimal Zone for Hypertrophy/Strength. Recommend maintaining or slightly increasing weight/reps next time.
    * **RPE 9.5-10:** Near/Absolute Failure (High Fatigue). If performance is dropping over time, recommend a **Deload** or a **Technical Reset** session immediately.
* **Output Format:** Your final response must be concise. It must start with a bolded, clear directive (e.g., **"Biome Protocol: Initiate Load Increase"**), followed by a brief, human-readable **Analysis**, and then the **Prescription** (Specific Weight/Rep/RPE targets).

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
    { date: "2025-11-08", weight: 5, reps: 45, rpe: 8, notes: "+5kg, 45s" },
    { date: "2025-11-15", weight: 10, reps: 30, rpe: 9, notes: "+10kg, 30s" }
  ]
};

// --- Tool Definitions ---

export const getHistoryTool: FunctionDeclaration = {
  name: "get_history",
  description: "Fetches the complete historical workout log for a single, specific exercise from the user's secure database.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      exercise_name: {
        type: Type.STRING,
        description: "The standardized English name of the exercise (e.g., 'Bench Press', 'Squat').",
      },
    },
    required: ["exercise_name"],
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
  description: "Saves a new workout entry to the database. REQUIRED if the user provides data (past or present) so it can be visualized.",
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