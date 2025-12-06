import { MOCK_DATABASE } from "../constants";
import { WorkoutLog, ExerciseMetrics } from "../types";

/**
 * Simulates fetching data from a database.
 */
export const getHistoryImpl = (exercise_name: string): string => {
  if (!exercise_name) return JSON.stringify([]);
  
  // Normalize casing and remove spaces for loose matching to handle 'BulgarianSquat' vs 'Bulgarian Squat'
  const target = exercise_name.toLowerCase().replace(/\s+/g, '');

  const normalizedKey = Object.keys(MOCK_DATABASE).find(
    (k) => k.toLowerCase().replace(/\s+/g, '') === target
  );

  if (!normalizedKey) {
    return JSON.stringify([]);
  }

  const logs = MOCK_DATABASE[normalizedKey];
  return JSON.stringify(logs);
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
  // For the demo, we just do weight * reps
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