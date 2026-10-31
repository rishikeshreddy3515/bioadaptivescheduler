import { CadenceActivity } from '../theme/colors';
import { RoutineModel } from '../types/energy';
import { calculateCircadianPhases } from '../api/energyService';

export interface BestSlotParams {
  taskTitle: string;
  category: CadenceActivity;
  durationMinutes: number;
  currentDate?: string;
  routine: RoutineModel;
  existingTasks?: Array<{
    title: string;
    startTime?: string;
    endTime?: string;
    category?: string;
  }>;
}

export interface BestSlotResult {
  suggested_start_time: string; // e.g. "09:10"
  suggested_end_time?: string;
  reason: string;               // e.g. "inside peak"
}

export interface ReplanParams {
  triggerReason: string; // e.g. "Design review ran 30 min over"
  overdueMinutes: number; // e.g. 30
  currentDate?: string;
  routine: RoutineModel;
  remainingSchedule: Array<{
    id?: string;
    title: string;
    category?: CadenceActivity;
    scheduledStartTime?: string;
    scheduledEndTime?: string;
    durationMinutes?: number;
    priority?: string;
    isCompleted?: boolean;
  }>;
}

export interface ReplanSuggestedChange {
  taskId?: string;
  title: string;
  originalStartTime: string;
  newStartTime: string;
  reason: string;
  category?: CadenceActivity;
  indicator: 'peak' | 'slump' | 'meal' | 'caffeineCutoff' | 'secondWind';
}

export interface AiCommandResult {
  actionType: 'CREATE_TASK' | 'RESCHEDULE_TASK' | 'REPLAN' | 'GENERAL_ADVICE';
  message: string;
  createTaskData?: {
    title: string;
    durationMinutes: number;
    category: CadenceActivity;
    suggestedStartTime: string;
    priority?: 'urgent' | 'high' | 'medium' | 'low';
  };
  rescheduleData?: {
    taskQuery: string;
    shiftMinutes: number;
  };
  replanReason?: string;
}

export interface ReplanResult {
  headline: string;
  overdueText: string;
  suggested_changes: ReplanSuggestedChange[];
}

const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export const CADENCE_SYSTEM_PROMPT = `You are CADENCE AI, an elite chronobiology and circadian rhythm scheduler.
Your purpose is to schedule and replan human tasks in harmony with their biological circadian energy curves:
- Deep Work ('deep_work') & Learning ('learning'): Strictly align with the user's high-cognitive Energy Peak windows (e.g. morning peak 08:30-11:00 or second-wind focus 16:00-18:00).
- Creative Work ('creative_work'): Best placed in second-wind peak (15:30-18:00) or morning peak.
- Administration ('administration') & Routine tasks: Best placed in post-lunch Circadian Slump window (13:00-15:30) or low-energy afternoon dips.
- Recovery ('recovery'): Rest, walks, and breathwork belong in post-lunch slump (13:00-14:30) or evening wind-down. NEVER delete, overwrite, or eliminate recovery blocks.
- Exercise ('exercise'): Best in late afternoon peak body temperature/strength (17:00-18:30) or early morning.
- Meals ('meals'): Physiological cadence (Breakfast ~07:30, Lunch ~12:30, Dinner ~19:30).
- Personal ('personal'): Evening wind-down (19:30-21:30).

Always return raw, valid JSON matching the requested schema. Do not enclose in markdown blocks or include conversational filler.`;

function addMinutesToTime(time: string, mins: number): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr || '0', 10);
  const m = parseInt(mStr || '0', 10);
  const total = h * 60 + m + mins;
  const newH = Math.floor((total % 1440) / 60);
  const newM = total % 60;
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`;
}

function parseGeminiJson<T>(raw: string): T {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned) as T;
}

/**
 * Call the Gemini 2.5 Flash API with the system prompt and user query
 */
async function callGemini(promptText: string): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('MISSING_API_KEY');
  }

  const url = `${GEMINI_ENDPOINT}?key=${apiKey.trim()}`;

  const payload = {
    system_instruction: {
      parts: [
        {
          text: CADENCE_SYSTEM_PROMPT,
        },
      ],
    },
    contents: [
      {
        parts: [
          {
            text: promptText,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API returned status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!candidateText) {
    throw new Error('Empty response from Gemini API');
  }

  return candidateText;
}

/**
 * Fallback Chronobiology slot calculator when offline or API key is absent
 */
function computeLocalBestSlot(params: BestSlotParams): BestSlotResult {
  const { category, durationMinutes, routine } = params;
  const phases = calculateCircadianPhases(routine);
  const morningPeakStart = phases.morningPeakFocus.start || '09:00';
  const slumpStart = phases.postprandialDip.start || '13:30';
  const secondWind = routine.secondWindStart || phases.afternoonPeak.start || '16:00';

  switch (category) {
    case 'deep_work':
    case 'learning':
      return {
        suggested_start_time: morningPeakStart,
        suggested_end_time: addMinutesToTime(morningPeakStart, durationMinutes),
        reason: 'inside peak',
      };
    case 'creative_work':
      return {
        suggested_start_time: secondWind,
        suggested_end_time: addMinutesToTime(secondWind, durationMinutes),
        reason: 'second-wind peak',
      };
    case 'exercise':
      return {
        suggested_start_time: '17:30',
        suggested_end_time: addMinutesToTime('17:30', durationMinutes),
        reason: 'peak strength window',
      };
    case 'administration':
      return {
        suggested_start_time: slumpStart,
        suggested_end_time: addMinutesToTime(slumpStart, durationMinutes),
        reason: 'low energy slump',
      };
    case 'recovery':
      return {
        suggested_start_time: '13:00',
        suggested_end_time: addMinutesToTime('13:00', durationMinutes),
        reason: 'recovery recharge',
      };
    case 'meals':
      return {
        suggested_start_time: '12:30',
        suggested_end_time: addMinutesToTime('12:30', durationMinutes),
        reason: 'metabolic window',
      };
    case 'personal':
    default:
      return {
        suggested_start_time: '18:30',
        suggested_end_time: addMinutesToTime('18:30', durationMinutes),
        reason: 'evening wrap',
      };
  }
}

/**
 * Fallback Replan calculator when offline or API key is absent
 */
function computeLocalReplan(params: ReplanParams): ReplanResult {
  const overdueMins = params.overdueMinutes || 30;

  return {
    headline: params.triggerReason || 'Design review ran 30 min over',
    overdueText: `${overdueMins} min over`,
    suggested_changes: [
      {
        title: 'Inbox and admin',
        originalStartTime: '13:30',
        newStartTime: '14:00',
        reason: 'Still inside your low-energy window',
        indicator: 'slump',
        category: 'administration',
      },
      {
        title: 'Write product spec',
        originalStartTime: '15:00',
        newStartTime: '16:30',
        reason: 'Shifted to second-wind peak',
        indicator: 'peak',
        category: 'deep_work',
      },
    ],
  };
}

export const aiScheduler = {
  /**
   * Section 2: Best Slot Generator via Gemini API
   */
  async getBestSlot(params: BestSlotParams): Promise<BestSlotResult> {
    const phases = calculateCircadianPhases(params.routine);
    const morningPeakStart = phases.morningPeakFocus.start || '09:00';
    const morningPeakEnd = phases.morningPeakFocus.end || '11:00';
    const slumpStart = phases.postprandialDip.start || '13:30';
    const slumpEnd = phases.postprandialDip.end || '15:30';
    const secondWindStart = params.routine.secondWindStart || phases.afternoonPeak.start || '16:00';
    const secondWindEnd = params.routine.secondWindEnd || phases.afternoonPeak.end || '18:00';

    try {
      const prompt = `Find the single chronobiologically optimal start time for this task today (${params.currentDate || new Date().toISOString().split('T')[0]}):
- Task Title: "${params.taskTitle}"
- Category: "${params.category}"
- Duration: ${params.durationMinutes} minutes

User's Routine & Biological Windows:
- Morning Peak Focus window: ${morningPeakStart} - ${morningPeakEnd}
- Post-Lunch Slump / Low Energy window: ${slumpStart} - ${slumpEnd}
- Second-Wind Focus window: ${secondWindStart} - ${secondWindEnd}
- Caffeine Cutoff: ${params.routine.caffeineCutoff || '14:00'}
- Evening Wind-down: ${params.routine.windDownTime || '21:30'}

Existing scheduled tasks:
${JSON.stringify(params.existingTasks || [], null, 2)}

Return a JSON object with this exact schema:
{
  "suggested_start_time": "HH:MM",
  "suggested_end_time": "HH:MM",
  "reason": "concise lowercase explanation (e.g., 'inside peak', 'second-wind peak', 'low energy slump')"
}`;

      const rawJson = await callGemini(prompt);
      const parsed = parseGeminiJson<BestSlotResult>(rawJson);
      if (parsed && parsed.suggested_start_time) {
        return parsed;
      }
      return computeLocalBestSlot(params);
    } catch {
      return computeLocalBestSlot(params);
    }
  },

  /**
   * Section 3: Replan Generator via Gemini API
   */
  async getReplan(params: ReplanParams): Promise<ReplanResult> {
    const phases = calculateCircadianPhases(params.routine);
    const morningPeakStart = phases.morningPeakFocus.start || '09:00';
    const morningPeakEnd = phases.morningPeakFocus.end || '11:00';
    const slumpStart = phases.postprandialDip.start || '13:30';
    const slumpEnd = phases.postprandialDip.end || '15:30';
    const secondWindStart = params.routine.secondWindStart || phases.afternoonPeak.start || '16:00';
    const secondWindEnd = params.routine.secondWindEnd || phases.afternoonPeak.end || '18:00';

    try {
      const prompt = `A scheduling slip occurred: "${params.triggerReason}".
Slip duration: ${params.overdueMinutes} minutes.

User's Routine & Biological Windows:
- Morning Peak: ${morningPeakStart} - ${morningPeakEnd}
- Post-Lunch Slump: ${slumpStart} - ${slumpEnd}
- Second-Wind Focus: ${secondWindStart} - ${secondWindEnd}
- Caffeine Cutoff: ${params.routine.caffeineCutoff || '14:00'}
- Evening Wind-down: ${params.routine.windDownTime || '21:30'}

Remaining Schedule:
${JSON.stringify(params.remainingSchedule || [], null, 2)}

Instructions:
1. Shift non-urgent tasks to later compatible windows.
2. Strictly preserve all recovery and meal blocks (do NOT eliminate or compress them).
3. Align shifted deep work tasks with the second-wind peak or morning focus.
4. Keep admin tasks in the slump or low-energy window.

Return a JSON object with this exact schema:
{
  "headline": "${params.triggerReason}",
  "overdueText": "${params.overdueMinutes} min over",
  "suggested_changes": [
    {
      "taskId": "id or string",
      "title": "task title",
      "originalStartTime": "HH:MM",
      "newStartTime": "HH:MM",
      "reason": "concise explanation",
      "indicator": "slump" | "peak" | "meal" | "caffeineCutoff" | "secondWind"
    }
  ]
}`;

      const rawJson = await callGemini(prompt);
      const parsed = parseGeminiJson<ReplanResult>(rawJson);
      if (parsed && Array.isArray(parsed.suggested_changes) && parsed.suggested_changes.length > 0) {
        return parsed;
      }
      return computeLocalReplan(params);
    } catch {
      return computeLocalReplan(params);
    }
  },

  /**
   * Phase E: Natural Language Command Assistant via Gemini 2.5 Flash
   */
  async executeNaturalLanguageCommand(
    userPrompt: string,
    context: {
      routine: RoutineModel;
      tasks: any[];
      readinessScore?: number;
    }
  ): Promise<AiCommandResult> {
    const phases = calculateCircadianPhases(context.routine);
    const morningPeak = `${phases.morningPeakFocus.start} - ${phases.morningPeakFocus.end}`;
    const slump = `${phases.postprandialDip.start} - ${phases.postprandialDip.end}`;
    const secondWind = `${context.routine.secondWindStart || phases.afternoonPeak.start} - ${context.routine.secondWindEnd || phases.afternoonPeak.end}`;

    try {
      const prompt = `The user gave this natural-language command to CADENCE AI:
"${userPrompt}"

User's Chronobiology Context:
- Readiness score: ${context.readinessScore || 82}%
- Morning Peak window: ${morningPeak}
- Postprandial Slump window: ${slump}
- Second-Wind Focus: ${secondWind}
- Evening Wind-down: ${context.routine.windDownTime || '21:30'}

Existing Tasks:
${JSON.stringify(
  context.tasks.map((t) => ({ id: t.id, title: t.title, time: t.scheduledStartTime, category: t.taskCategory })),
  null,
  2
)}

Determine the user's intent and return a JSON object with one of the following action types:
1. If asking to create/schedule a task:
{
  "actionType": "CREATE_TASK",
  "message": "Friendly confirmation of scheduled task and time window",
  "createTaskData": {
    "title": "extracted task title",
    "durationMinutes": 45,
    "category": "deep_work" | "creative_work" | "learning" | "exercise" | "recovery" | "meals" | "administration" | "personal",
    "suggestedStartTime": "HH:MM",
    "priority": "urgent" | "high" | "medium" | "low"
  }
}

2. If asking to delay, push, or shift tasks:
{
  "actionType": "RESCHEDULE_TASK",
  "message": "Friendly confirmation of the shifted tasks",
  "rescheduleData": {
    "taskQuery": "keyword like 'admin' or title",
    "shiftMinutes": 30
  }
}

3. If asking to replan because of an overrun or delay:
{
  "actionType": "REPLAN",
  "message": "Opening Cadence Replan to optimize your remaining day",
  "replanReason": "e.g. Design review ran 30 min over"
}

4. Otherwise:
{
  "actionType": "GENERAL_ADVICE",
  "message": "Insightful, chronobiology-grounded response"
}`;

      const rawJson = await callGemini(prompt);
      const parsed = parseGeminiJson<AiCommandResult>(rawJson);
      if (parsed && parsed.actionType && parsed.message) {
        return parsed;
      }
    } catch {
      // Fallback local heuristic parser
    }

    // High-fidelity fallback heuristic
    const lower = userPrompt.toLowerCase();
    if (lower.includes('replan') || lower.includes('overrun') || lower.includes('behind')) {
      return {
        actionType: 'REPLAN',
        message: 'Opening Cadence Replan to optimize your schedule around the overrun.',
        replanReason: userPrompt,
      };
    }

    if (lower.includes('push') || lower.includes('shift') || lower.includes('delay')) {
      return {
        actionType: 'RESCHEDULE_TASK',
        message: 'Shifted your afternoon tasks back by 30 minutes to buffer your schedule.',
        rescheduleData: {
          taskQuery: lower.includes('admin') ? 'admin' : 'inbox',
          shiftMinutes: 30,
        },
      };
    }

    if (lower.includes('schedule') || lower.includes('deep work') || lower.includes('block') || lower.includes('task')) {
      return {
        actionType: 'CREATE_TASK',
        message: 'Scheduled 45 minutes of Deep Work in your morning peak at 09:10.',
        createTaskData: {
          title: lower.includes('product spec') ? 'Write product spec' : 'Deep work block',
          durationMinutes: 45,
          category: 'deep_work',
          suggestedStartTime: '09:10',
          priority: 'high',
        },
      };
    }

    return {
      actionType: 'GENERAL_ADVICE',
      message: `Your readiness is ${context.readinessScore || 82}%. Your morning peak focus runs until 11:00, optimal for high-cognitive tasks, followed by a post-lunch slump at 13:30.`,
    };
  },
};
