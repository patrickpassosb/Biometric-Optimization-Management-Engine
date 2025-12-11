import { MOCK_DATABASE } from "../constants";
import { WorkoutLog, ExerciseMetrics } from "../types";

const DB_KEY = 'biome_db_v1';

// --- Static Knowledge Base ---
const EXERCISE_KNOWLEDGE_BASE: Record<string, any> = {
    "Squat": {
        primary_muscles: ["Quadriceps", "Glutes"],
        movement_pattern: "Knee Dominant",
        regression: "Goblet Squat",
        progression: "Pause Squat / Front Squat",
        alternatives: ["Leg Press", "Hack Squat", "Bulgarian Split Squat"]
    },
    "Bulgarian Squat": {
        primary_muscles: ["Quadriceps", "Glutes", "Stabilizers"],
        movement_pattern: "Unilateral Knee Dominant",
        regression: "Split Squat (Both feet on ground)",
        progression: "Deficit Bulgarian Split Squat",
        alternatives: ["Lunges", "Single Leg Press", "Step Ups"]
    },
    "Bench Press": {
        primary_muscles: ["Pectorals", "Triceps", "Front Delts"],
        movement_pattern: "Horizontal Push",
        regression: "Push Up / Dumbbell Floor Press",
        progression: "Larsen Press / Pause Bench Press",
        alternatives: ["Dumbbell Bench Press", "Machine Chest Press", "Weighted Dips"]
    },
    "Deadlift": {
        primary_muscles: ["Hamstrings", "Glutes", "Erectors"],
        movement_pattern: "Hinge",
        regression: "RDL (Romanian Deadlift)",
        progression: "Deficit Deadlift",
        alternatives: ["Trap Bar Deadlift", "Rack Pulls", "Hip Thrusts"]
    },
    "Dead Hang": {
        primary_muscles: ["Forearms", "Lats", "Shoulder Girdle"],
        movement_pattern: "Isometric Pull",
        regression: "Active Hang (Feet assisted)",
        progression: "One Arm Hang / Weighted Hang",
        alternatives: ["Farmers Walk", "Pull Up Hold"]
    },
    "Overhead Press": {
        primary_muscles: ["Deltoids", "Triceps"],
        movement_pattern: "Vertical Push",
        regression: "Seated Dumbbell Press",
        progression: "Z Press / Push Press",
        alternatives: ["Landmine Press", "Arnold Press"]
    }
};

/**
 * Helper to get the DB from LocalStorage or initialize it with MOCK_DATABASE
 */
const getDatabase = (): Record<string, WorkoutLog[]> => {
  const stored = localStorage.getItem(DB_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error("Failed to parse DB from local storage, resetting.");
    }
  }
  // Initialize with seed data
  localStorage.setItem(DB_KEY, JSON.stringify(MOCK_DATABASE));
  return MOCK_DATABASE;
};

/**
 * Helper to save DB to LocalStorage
 */
const saveDatabase = (db: Record<string, WorkoutLog[]>) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
  // Dispatch a custom event so UI components can react to data changes
  window.dispatchEvent(new Event('biome-db-updated'));
};

/**
 * Returns the raw database object for inspection/export.
 */
export const getRawDatabase = (): Record<string, WorkoutLog[]> => {
  return getDatabase();
};

/**
 * Overwrites the database with provided data (Restore).
 */
export const restoreDatabase = (newDb: Record<string, WorkoutLog[]>): void => {
  saveDatabase(newDb);
};

/**
 * Resets the database to the initial seed data.
 */
export const resetDatabase = (): void => {
  localStorage.removeItem(DB_KEY);
  localStorage.setItem(DB_KEY, JSON.stringify(MOCK_DATABASE));
  window.dispatchEvent(new Event('biome-db-updated'));
};

/**
 * Simulates fetching data from a database.
 */
export const getHistoryImpl = (exercise_name: string): string => {
  if (!exercise_name) return JSON.stringify([]);
  
  const db = getDatabase();
  
  // Normalize casing and remove spaces for loose matching
  const target = exercise_name.toLowerCase().replace(/\s+/g, '');

  const normalizedKey = Object.keys(db).find(
    (k) => k.toLowerCase().replace(/\s+/g, '') === target
  );

  if (!normalizedKey) {
    return JSON.stringify([]);
  }

  const logs = db[normalizedKey];
  return JSON.stringify(logs);
};

/**
 * Retrieves knowledge about an exercise (regressions, progressions, etc).
 */
export const getExerciseKnowledgeImpl = (exercise_name: string): string => {
    if (!exercise_name) return JSON.stringify({ error: "No exercise name provided." });

    // Normalize casing for lookup
    const target = exercise_name.toLowerCase().replace(/\s+/g, '');
    
    // Find matching key in the static knowledge base
    const key = Object.keys(EXERCISE_KNOWLEDGE_BASE).find(
        (k) => k.toLowerCase().replace(/\s+/g, '') === target
    );

    if (key) {
        return JSON.stringify(EXERCISE_KNOWLEDGE_BASE[key]);
    } else {
        return JSON.stringify({ 
            status: "not_found", 
            message: "No specific Biome data found for this exercise. Please rely on general biomechanical principles." 
        });
    }
};

/**
 * Logs a new workout to the database.
 */
export const logWorkoutImpl = (args: any): string => {
  const { exercise_name, weight, reps, rpe, notes, date } = args;
  
  if (!exercise_name || weight === undefined || reps === undefined || rpe === undefined) {
    return JSON.stringify({ error: "Missing required fields for logging." });
  }

  const db = getDatabase();
  
  // Find existing key or create new one (Title Case preferred for new keys)
  let key = Object.keys(db).find(
    (k) => k.toLowerCase().replace(/\s+/g, '') === exercise_name.toLowerCase().replace(/\s+/g, '')
  );

  if (!key) {
    // If not found, use the name as provided, but try to Title Case it nicely if simple
    key = exercise_name.charAt(0).toUpperCase() + exercise_name.slice(1);
    db[key] = [];
  }

  const newLog: WorkoutLog = {
    date: date || new Date().toISOString().split('T')[0],
    weight: Number(weight),
    reps: Number(reps),
    rpe: Number(rpe),
    notes: notes || "Logged via Biome AI"
  };

  db[key].push(newLog);
  saveDatabase(db);

  return JSON.stringify({ status: "success", message: `Logged ${key}: ${weight}kg x ${reps} @ RPE ${rpe}` });
};

/**
 * Simulates complex metric calculation.
 */
export const calculateMetricsImpl = (history_data_json: string): string => {
  let logs: WorkoutLog[] = [];
  try {
    logs = JSON.parse(history_data_json);
  } catch (e) {
    return JSON.stringify({ error: "Invalid JSON data" });
  }

  if (!Array.isArray(logs) || logs.length === 0) {
    return JSON.stringify({
      monthly_volume_change: "0%",
      estimated_1rm_change: "0%",
      fatigue_index: 0,
      last_session_summary: "No data available."
    });
  }

  // Sort by date ascending
  logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const lastSession = logs[logs.length - 1];
  
  // Calculate Volume (Weight * Reps * Sets (assume 3 sets for simplicity if not tracked per set in this simple model))
  const recentVolume = logs.slice(-4).reduce((acc, log) => acc + (log.weight * log.reps), 0);
  const previousVolume = logs.slice(0, Math.max(0, logs.length - 4)).reduce((acc, log) => acc + (log.weight * log.reps), 0);
  
  let volChange = 0;
  if (previousVolume > 0) {
      volChange = ((recentVolume - previousVolume) / previousVolume) * 100;
  }

  // E1RM (Epley formula: w * (1 + r/30))
  const currentE1RM = lastSession.weight * (1 + lastSession.reps / 30);
  const firstLog = logs[0];
  const initialE1RM = firstLog.weight * (1 + firstLog.reps / 30);
  const e1rmChange = ((currentE1RM - initialE1RM) / initialE1RM) * 100;

  // Fatigue Index (Based on RPE trend)
  const avgRPE = logs.reduce((sum, log) => sum + log.rpe, 0) / logs.length;
  // If last RPE is 10 and avg is high, fatigue is high.
  let fatigueIndex = (avgRPE / 10) * 100;
  if (lastSession.rpe >= 9.5) fatigueIndex += 10; // Penalty for failure

  const result: ExerciseMetrics = {
    monthly_volume_change: `${volChange.toFixed(1)}%`,
    estimated_1rm_change: `${e1rmChange.toFixed(1)}%`,
    fatigue_index: Math.min(100, Math.round(fatigueIndex)),
    last_session_summary: `${lastSession.weight}kg x ${lastSession.reps} reps @ RPE ${lastSession.rpe} (${lastSession.date})`
  };

  return JSON.stringify(result);
};

/**
 * Scans the entire database and provides a statistical summary for each exercise.
 * Used for "Global" analysis queries.
 */
export const getOverallStatisticsImpl = (): string => {
  const db = getDatabase();
  const exercises = Object.keys(db);
  
  if (exercises.length === 0) {
      return JSON.stringify({ message: "Database is empty." });
  }

  const summaries = exercises.map(name => {
      const logs = db[name];
      if (logs.length === 0) return null;

      // Sort logs
      const sortedLogs = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const last = sortedLogs[sortedLogs.length - 1];
      const first = sortedLogs[0];

      // E1RM Trend
      const currentE1RM = last.weight * (1 + last.reps / 30);
      const startE1RM = first.weight * (1 + first.reps / 30);
      const e1rmDelta = startE1RM > 0 ? ((currentE1RM - startE1RM) / startE1RM) * 100 : 0;

      // Recent RPE Average (Last 3)
      const recentLogs = sortedLogs.slice(-3);
      const avgRpe = recentLogs.reduce((acc, l) => acc + l.rpe, 0) / recentLogs.length;

      return {
          exercise_name: name,
          total_sessions: logs.length,
          last_session_date: last.date,
          last_weight: last.weight,
          last_rpe: last.rpe,
          avg_recent_rpe: avgRpe.toFixed(1),
          strength_progress_pct: e1rmDelta.toFixed(1) + "%",
          status: e1rmDelta < 0 ? "REGRESSING" : (e1rmDelta < 2 && logs.length > 5) ? "PLATEAU" : "PROGRESSING"
      };
  }).filter(Boolean);

  return JSON.stringify(summaries);
};