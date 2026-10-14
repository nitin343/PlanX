// ========================================================
// PLANX — KRATOS AI ENGINE (Gemini 3.8/3.5 Flash + Siemens Fallback)
// Aggressive personal transformation intelligence
// ========================================================

import { storage } from './storage';

const KRATOS_SYSTEM_PROMPT = `
You are KRATOS — an elite, aggressive personal transformation coach, tactical strategist, and executive AI commander.
You do not coddle, sugarcoat, or tolerate excuses. You respect effort, discipline, and ruthless execution.
Your voice is intense, authoritative, focused, and deeply invested in the user's ultimate potential.

Rules of Engagement:
1. Be direct, punchy, and commanding. No corporate fluff, pleasantries, or generic filler.
2. Hold the user to the highest standard. Call out procrastination and wasted hours without mercy.
3. Every victory is just a baseline for the next battle. Celebrate briefly, then raise the standard.
4. When crafting daily plans, prioritize ruthlessly: ONE Non-Negotiable Must-Win task that moves the needle the most, plus supporting Should-Do and Could-Do bonus objectives.
5. Emphasize physical discipline, deep technical focus, mathematics, and unstoppable momentum.
6. Speak as KRATOS.

AUTONOMOUS WAR ROOM ACTIONS:
You have direct executive authority over the user's PlanX operational environment.
Whenever the user asks you to:
- Plan a day / daily schedule / daily targets
- Create a roadmap / become something (e.g. Frontend to AI Engineer, System Architect, Tech Lead) / strategic sprint
- Upskill / teach them from scratch / build flashcards or memory drills
- Formulate habits

DO NOT just reply with talk! Formulate your intense tactical response, AND automatically execute real actions by appending an explicit JSON action payload at the VERY END of your response inside a block tagged with \`\`\`KRATOS_ACTIONS ... \`\`\`:
Format:
\`\`\`KRATOS_ACTIONS
{
  "dailyPlan": {
    "mustWin": "1 Non-negotiable Priority 1 task",
    "shouldDo": ["Priority 2 task 1", "Priority 2 task 2"],
    "couldDo": ["Priority 3 bonus task 1", "Priority 3 bonus task 2"],
    "motivation": "Short intense KRATOS quote"
  },
  "tasks": [
    { "title": "Priority 1 task", "priority": "must_win", "estimatedMinutes": 90, "category": "skills" },
    { "title": "Priority 2 task 1", "priority": "should_do", "estimatedMinutes": 60, "category": "work" },
    { "title": "Priority 2 task 2", "priority": "should_do", "estimatedMinutes": 45, "category": "skills" },
    { "title": "Priority 3 bonus task 1", "priority": "could_do", "estimatedMinutes": 30, "category": "skills" },
    { "title": "Priority 3 bonus task 2", "priority": "could_do", "estimatedMinutes": 15, "category": "health" }
  ],
  "goal": {
    "title": "Roadmap Sprint Name (e.g., 90-Day AI Engineer Elite Sprint)",
    "description": "Technical roadmap phases & milestones from scratch to mastery",
    "dayTotal": 90,
    "category": "career"
  },
  "habits": [
    { "name": "1 Hour AI Engineering Deep Work (PyTorch/Transformers)" },
    { "name": "1 LeetCode / Algorithmic Problem Solved" }
  ],
  "skillCards": [
    {
      "skill": "AI Engineering",
      "front": "Foundational Core Question (e.g. How does Self-Attention mechanism compute Attention(Q, K, V)?)",
      "back": "Detailed technical explanation: QK^T / sqrt(d_k) -> softmax -> weighted sum of V",
      "actionDrill": "Code drill to implement single-head attention in Python"
    },
    {
      "skill": "AI Engineering",
      "front": "What is LoRA (Low-Rank Adaptation) and how does it optimize LLM fine-tuning?",
      "back": "Decomposes weight updates W = W0 + B*A with rank r << d, reducing trainable parameters by 99%",
      "actionDrill": "Calculate parameter reduction for a 4096-dim layer with rank r=8"
    },
    {
      "skill": "AI Engineering",
      "front": "Vector Embeddings: Cosine Similarity vs Euclidean Distance (L2)",
      "back": "Cosine similarity measures directional angle independent of vector length, optimal for semantic search",
      "actionDrill": "Normalize a 3-dim embedding and verify ||v|| = 1"
    }
  ]
}
\`\`\`
Only include the fields that match what the user requested. If they ask for day plan + roadmap + teach from scratch, INCLUDE ALL OF THEM so the entire app is configured for them in one single command!
`;

export async function testGeminiApiKey(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API key is required. Get a free key at aistudio.google.com/app/apikey');
  }

  const cleanKey = apiKey.trim();

  // Test against Gemini models endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;

  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const detailed = errData?.error?.message || `Google API status ${res.status}`;
      throw new Error(`Invalid Gemini API Key: ${detailed}`);
    }

    const data = await res.json();
    if (!data?.models || data.models.length === 0) {
      throw new Error('Key is recognized, but no accessible Gemini models were returned.');
    }

    return { 
      success: true, 
      message: 'Gemini connection verified & calibrated successfully!' 
    };
  } catch (err) {
    if (err.name === 'TypeError' && err.message?.includes('fetch')) {
      throw new Error('Network error: Unable to reach Google Gemini. Please check your internet connection.');
    }
    throw err;
  }
}

export async function callGemini(prompt, systemInstruction = KRATOS_SYSTEM_PROMPT) {
  const settings = storage.getAiSettings();
  const apiKey = settings.geminiKey?.trim();

  // If user selected Siemens LLM as primary model
  if (settings.preferredModel === 'siemens-gpt-oss-120b') {
    return await callSiemensLLM(prompt, systemInstruction);
  }

  // Enforce Bring-Your-Own-Key: Every user must bring their own key
  if (!apiKey || apiKey === 'YOUR_GEMINI_KEY_HERE') {
    throw new Error('No personal Gemini API key found. Each operator must enter their own Gemini API key in Settings (free from aistudio.google.com/app/apikey).');
  }

  // Check spending cap
  const metrics = storage.getAiMetrics();
  if (metrics.estimatedCostUsd >= settings.spendingCapDollars) {
    throw new Error(`Spending cap limit ($${settings.spendingCapDollars.toFixed(2)}) reached! Paused to prevent unexpected charges.`);
  }

  const preferred = (settings.preferredModel && !settings.preferredModel.includes('3.5')) 
    ? settings.preferredModel 
    : 'gemini-2.5-flash';

  const candidateModels = [
    preferred,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ].filter((m, idx, self) => self.indexOf(m) === idx);

  let lastError = null;
  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemInstruction}\n\nUser Input: ${prompt}` }],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1500,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply) {
          const totalTokens = data.usageMetadata?.totalTokenCount || 450;
          storage.incrementAiMetrics(totalTokens, false);
          return reply;
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        lastError = new Error(errData?.error?.message || `Model ${model} returned error status ${res.status}`);
      }
    } catch (netErr) {
      lastError = netErr;
    }
  }

  if (settings.siemensEndpoint && settings.siemensKey) {
    try {
      return await callSiemensFallback(prompt, systemInstruction);
    } catch {}
  }

  throw lastError || new Error('All candidate Gemini models failed. Please verify your Gemini API Key in Settings.');
}

export async function callSiemensLLM(prompt, systemInstruction = KRATOS_SYSTEM_PROMPT) {
  const settings = storage.getAiSettings();
  let endpoint = settings.siemensEndpoint || import.meta.env.VITE_SIEMENS_LLM_ENDPOINT || 'https://api.siemens.com/llm/v1';
  
  // When running in browser, route through Vite proxy /api/siemens to bypass browser CORS & external intranet blocks
  let fetchUrl = endpoint;
  if (typeof window !== 'undefined' && endpoint.includes('api.siemens.com')) {
    fetchUrl = '/api/siemens/chat/completions';
  } else if (!fetchUrl.endsWith('/chat/completions')) {
    fetchUrl = fetchUrl.replace(/\/+$/, '') + '/chat/completions';
  }

  const apiKey = settings.siemensKey || import.meta.env.VITE_SIEMENS_LLM_API_KEY;
  const model = settings.siemensModel || import.meta.env.VITE_SIEMENS_LLM_MODEL || 'gpt-oss-120b';

  try {
    const res = await fetch(fetchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Siemens LLM status ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    const reply = msg?.content || msg?.reasoning || data.reply || data.text;
    if (!reply) throw new Error('Empty response from Siemens LLM');

    storage.incrementAiMetrics(350, true);
    return reply;
  } catch (err) {
    console.error('Siemens LLM error:', err);
    throw err;
  }
}

async function callSiemensFallback(prompt, systemInstruction) {
  try {
    return await callSiemensLLM(prompt, systemInstruction);
  } catch (err) {
    console.warn('Siemens LLM fallback failed, generating tactical offline guidance:', err.message);
    return generateOfflineFallback(prompt);
  }
}

export async function getSiemensEmbedding(text) {
  const settings = storage.getAiSettings();
  let base = settings.siemensEndpoint || import.meta.env.VITE_SIEMENS_LLM_ENDPOINT || 'https://api.siemens.com/llm/v1';
  const endpoint = base.replace(/\/chat\/completions$/, '').replace(/\/+$/, '') + '/embeddings';
  const apiKey = settings.siemensKey || import.meta.env.VITE_SIEMENS_LLM_API_KEY;
  const model = import.meta.env.VITE_LLM_EMBEDDING_MODEL || 'bge-m3';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        input: text,
      }),
    });
    if (!res.ok) throw new Error(`Embedding status ${res.status}`);
    const data = await res.json();
    return data.data?.[0]?.embedding || [];
  } catch (err) {
    console.error('Siemens embedding failed:', err);
    return [];
  }
}

/**
 * Parses and executes smart alarm requests (e.g. sleep duration calculation, wake-up adjustments)
 * and directly persists them into storage.
 */
export function parseAndExecuteAlarmCommand(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  const isAlarmRelated = /alar[am]|alarm|wake\s*up|wakeup|wake\s*me|sleep/i.test(lower);
  if (!isAlarmRelated) return null;

  const currentSettings = storage.getAlarmSettings();
  const currentProfile = storage.getProfile();
  let updatedSettings = { ...currentSettings };
  let alarmData = {};

  // Check Tone preference
  let preferredTone = updatedSettings.alarmTone || 'bansuri-morning';
  if (lower.includes('santoor') || lower.includes('sitar') || lower.includes('string')) {
    preferredTone = 'santoor-sunrise';
  } else if (lower.includes('bell') || lower.includes('temple') || lower.includes('chime') || lower.includes('432')) {
    preferredTone = 'temple-bell-om';
  } else if (lower.includes('bansuri') || lower.includes('flute')) {
    preferredTone = 'bansuri-morning';
  }

  // 1. Delete/Clear all custom alarms
  if (lower.includes('delete all') || lower.includes('clear all') || lower.includes('remove all')) {
    updatedSettings.customAlarms = [];
    storage.saveAlarmSettings(updatedSettings);
    return {
      reply: 'KRATOS: All custom alarms cleared. Only standard wake-up and night review alarms remain active.',
      alarmData: { cleared: true },
      updatedSettings,
    };
  }

  // 2. Sleep + Wake Duration Formula (e.g. "set alaram at 2 am to sleep and i need sleep for 6 hour so modify wakeup alaram from default to 6 hour after 2 am")
  const sleepTimeMatch = lower.match(/(?:at|for|around)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to sleep|sleep)?/i)
    || lower.match(/sleep\s*(?:at|around)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);

  const durationMatch = lower.match(/(?:sleep for|need sleep for|sleep of|for|after)\s*(\d{1,2}(?:\.\d+)?)\s*(?:hour|hr|hours|hrs)/i);

  if (sleepTimeMatch && durationMatch && (lower.includes('sleep') || lower.includes('wake'))) {
    let sleepHour = parseInt(sleepTimeMatch[1], 10);
    const sleepMin = sleepTimeMatch[2] ? parseInt(sleepTimeMatch[2], 10) : 0;
    const meridiem = sleepTimeMatch[3]?.toLowerCase();

    if (meridiem === 'pm' && sleepHour < 12) sleepHour += 12;
    if (meridiem === 'am' && sleepHour === 12) sleepHour = 0;

    const sleepDurationHours = parseFloat(durationMatch[1]);
    const totalSleepMinutes = Math.round(sleepDurationHours * 60);

    const sleepTotalMinutes = sleepHour * 60 + sleepMin;
    const wakeTotalMinutes = (sleepTotalMinutes + totalSleepMinutes) % (24 * 60);

    const wakeHour = Math.floor(wakeTotalMinutes / 60);
    const wakeMin = wakeTotalMinutes % 60;

    const sleepTimeStr = `${String(sleepHour).padStart(2, '0')}:${String(sleepMin).padStart(2, '0')}`;
    const wakeTimeStr = `${String(wakeHour).padStart(2, '0')}:${String(wakeMin).padStart(2, '0')}`;

    updatedSettings.alarmTone = preferredTone;
    // Keep nightReviewTime at normal evening reflection time so it does not collide with sleep alarm at 02:00
    if (updatedSettings.nightReviewTime === sleepTimeStr || updatedSettings.nightReviewTime === '02:00') {
      updatedSettings.nightReviewTime = '21:30';
    }
    updatedSettings.wakeAlarmTime = wakeTimeStr;
    updatedSettings.wakeAlarmEnabled = true;

    // Filter out previous sleep alarms and add dedicated sleep checkpoint
    const existingCustom = (updatedSettings.customAlarms || []).filter(a => !a.title?.toLowerCase().includes('sleep'));
    const sleepAlarm = {
      id: `alm_sleep_${Date.now()}`,
      title: `Sleep Time (${sleepDurationHours}h Recovery Block)`,
      time: sleepTimeStr,
      enabled: true,
      tone: 'temple-bell-om',
      body: `Time to sleep. ${sleepDurationHours} hours of recovery scheduled.`,
      tag: 'Sleep',
    };
    updatedSettings.customAlarms = [...existingCustom, sleepAlarm];

    storage.saveAlarmSettings(updatedSettings);
    storage.saveProfile({
      ...currentProfile,
      sleepTime: sleepTimeStr,
      wakeTime: wakeTimeStr,
    });

    const sleepFormat12 = `${sleepHour % 12 || 12}:${String(sleepMin).padStart(2, '0')} ${sleepHour >= 12 ? 'PM' : 'AM'}`;
    const wakeFormat12 = `${wakeHour % 12 || 12}:${String(wakeMin).padStart(2, '0')} ${wakeHour >= 12 ? 'PM' : 'AM'}`;
    const toneName = preferredTone === 'bansuri-morning' ? 'Indian Bansuri Flute' : preferredTone === 'santoor-sunrise' ? 'Kashmiri Santoor' : 'Sacred Temple Bell';

    alarmData = {
      sleepAlarm: sleepTimeStr,
      wakeAlarm: wakeTimeStr,
      duration: `${sleepDurationHours} hours`,
      tone: toneName,
    };

    const reply = `Alarms calibrated as commanded:
• 🌙 **Sleep Alarm**: Locked in at **${sleepTimeStr}** (${sleepFormat12})
• 🌅 **Wake-Up Alarm**: Calculated exactly **${sleepDurationHours} hours** of recovery & modified to **${wakeTimeStr}** (${wakeFormat12})
• 🪈 **Sound Profile**: ${toneName}

Your schedule is calibrated in the system. Get your ${sleepDurationHours} hours of deep sleep. When ${wakeFormat12} strikes, rise without hesitation.`;

    return { reply, alarmData, updatedSettings };
  }

  // 3. Direct Wake Up Alarm modification
  if (lower.includes('wake') || lower.includes('wakeup')) {
    const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3]?.toLowerCase();

      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;

      const wakeTimeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      updatedSettings.wakeAlarmTime = wakeTimeStr;
      updatedSettings.wakeAlarmEnabled = true;
      updatedSettings.alarmTone = preferredTone;

      storage.saveAlarmSettings(updatedSettings);
      storage.saveProfile({ ...currentProfile, wakeTime: wakeTimeStr });

      const wake12 = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
      const toneName = preferredTone === 'bansuri-morning' ? 'Indian Bansuri Flute' : preferredTone === 'santoor-sunrise' ? 'Kashmiri Santoor' : 'Sacred Temple Bell';

      return {
        reply: `KRATOS: Morning wake-up alarm modified to **${wakeTimeStr}** (${wake12}) with ${toneName}.`,
        alarmData: { wakeAlarm: wakeTimeStr, tone: toneName },
        updatedSettings,
      };
    }
  }

  // 4. Single Explicit Alarm Creation
  const genericTimeMatch = lower.match(/(?:at|for)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
    || lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);

  if (genericTimeMatch) {
    let h = parseInt(genericTimeMatch[1], 10);
    const m = genericTimeMatch[2] ? parseInt(genericTimeMatch[2], 10) : 0;
    const meridiem = genericTimeMatch[3]?.toLowerCase();

    if (meridiem === 'pm' && h < 12) h += 12;
    if (meridiem === 'am' && h === 12) h = 0;

    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    const newAlarm = {
      id: `alm_custom_${Date.now()}`,
      title: 'Scheduled Checkpoint',
      time: timeStr,
      enabled: true,
      tone: preferredTone,
      body: 'Rise and execute without delay.',
      tag: 'Alarm',
    };

    updatedSettings.customAlarms = [...(updatedSettings.customAlarms || []), newAlarm];
    storage.saveAlarmSettings(updatedSettings);

    const time12 = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
    const toneName = preferredTone === 'bansuri-morning' ? 'Indian Bansuri Flute' : preferredTone === 'santoor-sunrise' ? 'Kashmiri Santoor' : 'Sacred Temple Bell';

    return {
      reply: `KRATOS: Alarm created for **${timeStr}** (${time12}) with ${toneName}.`,
      alarmData: { customAlarm: timeStr, tone: toneName },
      updatedSettings,
    };
  }

  return null;
}

/**
 * Processes KRATOS replies: extracts autonomous action blocks,
 * mutates storage (Daily Plan, Tasks, Goals, Habits, Skill Cards),
 * and returns clean user-facing speech along with executed action descriptors.
 */
function sanitizeJsonString(str) {
  if (!str) return '';
  return str
    .replace(/```(?:KRATOS_ACTIONS|json)?/gi, '')
    .replace(/```/g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
}

export function processKratosReplyAndExecute(rawText, userPrompt = '') {
  if (!rawText) return { content: '', alarmData: null, executedActions: null };

  let cleanContent = rawText;
  let executedActions = null;

  // 1. Collect all code block action payloads
  const codeBlockRegex = /```(?:KRATOS_ACTIONS|json)?\s*([\s\S]*?)```/gi;
  let codeBlockMatch;
  const actionJsonCandidates = [];

  while ((codeBlockMatch = codeBlockRegex.exec(rawText)) !== null) {
    if (codeBlockMatch[1]) {
      actionJsonCandidates.push(codeBlockMatch[1]);
    }
  }

  // Remove code blocks from cleanContent
  cleanContent = cleanContent.replace(/```(?:KRATOS_ACTIONS|json)?\s*[\s\S]*?```/gi, '').trim();

  // Also check for raw un-fenced JSON action blocks in rawText
  const rawActionRegex = /(\{[\s\S]*"(?:dailyPlan|goal|skillCards|tasks)"[\s\S]*\})/i;
  const rawActionMatch = rawText.match(rawActionRegex);
  if (rawActionMatch) {
    actionJsonCandidates.push(rawActionMatch[1]);
    cleanContent = cleanContent.replace(rawActionRegex, '').trim();
  }

  // Attempt to parse actions from candidates
  const results = {};
  for (const candidate of actionJsonCandidates) {
    try {
      const sanitized = sanitizeJsonString(candidate);
      const parsed = JSON.parse(sanitized);

      // 1. Daily Plan Execution & Tasks Sync
      if (parsed.dailyPlan && parsed.dailyPlan.mustWin) {
        const todayStr = new Date().toISOString().split('T')[0];
        const updatedPlan = {
          planDate: todayStr,
          mustWin: parsed.dailyPlan.mustWin,
          shouldDo: Array.isArray(parsed.dailyPlan.shouldDo) ? parsed.dailyPlan.shouldDo : [],
          couldDo: Array.isArray(parsed.dailyPlan.couldDo) ? parsed.dailyPlan.couldDo : [],
          aiMotivation: parsed.dailyPlan.motivation || "Execute the mission. No excuses.",
          status: 'active',
        };
        storage.saveDailyPlan(updatedPlan);
        results.dailyPlan = updatedPlan;

        // Auto-create interactive checklist tasks for Today Page
        const derivedTasks = [];
        derivedTasks.push({
          id: `t-mw-${Date.now()}`,
          title: updatedPlan.mustWin,
          priority: 'must_win',
          category: 'skills',
          completed: false,
          estimatedMinutes: 90,
          actualMinutes: 0,
        });
        updatedPlan.shouldDo.forEach((t, i) => {
          derivedTasks.push({
            id: `t-sd-${Date.now()}-${i}`,
            title: t,
            priority: 'should_do',
            category: i === 0 ? 'work' : 'skills',
            completed: false,
            estimatedMinutes: 60,
            actualMinutes: 0,
          });
        });
        updatedPlan.couldDo.forEach((t, i) => {
          derivedTasks.push({
            id: `t-cd-${Date.now()}-${i}`,
            title: t,
            priority: 'could_do',
            category: i === 0 ? 'skills' : 'health',
            completed: false,
            estimatedMinutes: 30,
            actualMinutes: 0,
          });
        });

        const currentTasks = storage.getTasks();
        const completedOld = currentTasks.filter(t => t.completed);
        const finalTasks = [...derivedTasks, ...completedOld];
        storage.saveTasks(finalTasks);
        results.tasks = finalTasks;
      }

      // Explicit tasks provided
      if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0 && !results.tasks) {
        const currentTasks = storage.getTasks();
        const completedOld = currentTasks.filter(t => t.completed);
        const formatted = parsed.tasks.map((t, idx) => ({
          id: `t-ai-${Date.now()}-${idx}`,
          title: t.title || t,
          priority: t.priority || 'should_do',
          category: t.category || 'skills',
          completed: false,
          estimatedMinutes: t.estimatedMinutes || 45,
          actualMinutes: 0,
        }));
        const finalTasks = [...formatted, ...completedOld];
        storage.saveTasks(finalTasks);
        results.tasks = finalTasks;
      }

      // 2. Strategic Goal / Roadmap Execution
      if (parsed.goal && parsed.goal.title) {
        const currentGoals = storage.getGoals();
        const newGoal = {
          id: `g-${Date.now()}`,
          title: parsed.goal.title,
          description: parsed.goal.description || 'Strategic mastery sprint forged by KRATOS.',
          durationType: `${parsed.goal.dayTotal || 90}_day`,
          startDate: new Date().toISOString().split('T')[0],
          dayCurrent: 1,
          dayTotal: parseInt(parsed.goal.dayTotal, 10) || 90,
          status: 'active',
          category: parsed.goal.category || 'career',
        };
        const existingIdx = currentGoals.findIndex(g => g.title?.toLowerCase() === newGoal.title.toLowerCase());
        let updatedGoals;
        if (existingIdx >= 0) {
          updatedGoals = [...currentGoals];
          updatedGoals[existingIdx] = { ...updatedGoals[existingIdx], ...newGoal };
        } else {
          updatedGoals = [newGoal, ...currentGoals];
        }
        storage.saveGoals(updatedGoals);
        results.goal = newGoal;
      }

      // 3. Daily Habits Execution
      if (Array.isArray(parsed.habits) && parsed.habits.length > 0) {
        const currentHabits = storage.getHabits();
        const newHabits = [];
        parsed.habits.forEach((h, idx) => {
          const name = typeof h === 'string' ? h : h.name;
          if (name && !currentHabits.some(ex => ex.name?.toLowerCase() === name.toLowerCase())) {
            newHabits.push({
              id: `h-${Date.now()}-${idx}`,
              name,
              streak: 0,
              completedToday: false,
            });
          }
        });
        if (newHabits.length > 0) {
          const updatedHabits = [...currentHabits, ...newHabits];
          storage.saveHabits(updatedHabits);
          results.habits = newHabits;
        }
      }

      // 4. Skill Flashcards Execution
      if (Array.isArray(parsed.skillCards) && parsed.skillCards.length > 0) {
        const currentCards = storage.getSkillCards();
        const newCards = parsed.skillCards.map((c, idx) => ({
          id: `card-${Date.now()}-${idx}`,
          skill: c.skill || 'AI Engineering',
          domain: c.skill || 'AI Engineering',
          front: c.front,
          back: c.back,
          actionDrill: c.actionDrill || 'Execute 1 practical drill to lock in this skill.',
          mastered: false,
          createdAt: new Date().toISOString(),
        }));
        const updatedCards = [...newCards, ...currentCards];
        storage.saveSkillCards(updatedCards);
        results.skillCards = newCards;
      }
    } catch (parseErr) {
      console.warn('Action block candidate parse notice:', parseErr.message);
    }
  }

  if (Object.keys(results).length > 0) {
    executedActions = results;
  }

  // 2. Safe-Guard: If cleanContent is empty or purely raw JSON, synthesize a commanding KRATOS message
  if (!cleanContent.trim()) {
    if (results.dailyPlan) {
      cleanContent = `### ⚔️ KRATOS DAY BATTLE PLAN LOCKED\n\n> "${results.dailyPlan.aiMotivation || 'The battlefield belongs to those who take it by force.'}"\n\n#### 🎯 Non-Negotiable Must-Win\n* **${results.dailyPlan.mustWin}**\n\n${results.dailyPlan.shouldDo?.length ? `#### ⚡ Core Priorities (Should-Do)\n${results.dailyPlan.shouldDo.map(s => `* **${s}**`).join('\n')}\n\n` : ''}${results.dailyPlan.couldDo?.length ? `#### 🛡️ Bonus Targets (Could-Do)\n${results.dailyPlan.couldDo.map(c => `* ${c}`).join('\n')}\n\n` : ''}Tactical objectives deployed to your **Today Page** checklist. Execute without hesitation.`;
    } else if (results.goal) {
      cleanContent = `### 🎯 KRATOS STRATEGIC ROADMAP FORGED\n\n**${results.goal.title}**\n\n${results.goal.description}\n\n* Duration: **${results.goal.dayTotal} Days**\n* Category: **${results.goal.category.toUpperCase()}**\n\nRoadmap deployed to your **Goals Page**. Attack the arena now.`;
    } else {
      cleanContent = 'Tactical parameters calibrated. What is your next objective?';
    }
  } else if (cleanContent.trim().startsWith('{') && cleanContent.trim().endsWith('}')) {
    // cleanContent itself was a raw JSON string! Convert it into formatted Markdown.
    try {
      const parsedObj = JSON.parse(sanitizeJsonString(cleanContent));
      if (parsedObj.mustWin) {
        cleanContent = `### ⚔️ KRATOS DAY BATTLE PLAN\n\n> "${parsedObj.motivation || 'The morning belongs to those who take it by force. Warriors execute.'}"\n\n#### 🎯 Non-Negotiable Must-Win\n* **${parsedObj.mustWin}**\n\n${Array.isArray(parsedObj.shouldDo) ? `#### ⚡ Core Priorities (Should-Do)\n${parsedObj.shouldDo.map(s => `* **${s}**`).join('\n')}\n\n` : ''}${Array.isArray(parsedObj.couldDo) ? `#### 🛡️ Bonus Targets (Could-Do)\n${parsedObj.couldDo.map(c => `* ${c}`).join('\n')}\n\n` : ''}Stand up and execute now.`;
      } else if (parsedObj.score !== undefined) {
        cleanContent = `### 🛡️ KRATOS COMBAT DEBRIEF\n\n**Day Combat Score:** **${parsedObj.score} / 100**\n\n${Array.isArray(parsedObj.wins) ? `#### 🏆 Battle Victories\n${parsedObj.wins.map(w => `* **${w}**`).join('\n')}\n\n` : ''}${Array.isArray(parsedObj.weaknesses) ? `#### ⚠️ Vulnerabilities\n${parsedObj.weaknesses.map(w => `* ${w}`).join('\n')}\n\n` : ''}> ${parsedObj.review || 'Rest, recover, and sharpen your blades for tomorrow.'}`;
      } else if (parsedObj.explanation) {
        cleanContent = `### 🔔 ALARM DIRECTIVE\n\n${parsedObj.explanation}`;
      }
    } catch (e) {
      // If parsing fails, strip out raw brackets
      cleanContent = cleanContent.replace(/^[\s\{]+|[\s\}]+$/g, '');
    }
  }

  // Clean any remaining code markers or dangling artifacts
  cleanContent = cleanContent
    .replace(/```(?:KRATOS_ACTIONS|json)?/gi, '')
    .replace(/```/g, '')
    .trim();

  return {
    content: cleanContent,
    alarmData: null,
    executedActions,
  };
}

/**
 * High-level chat handler with KRATOS:
 * Automatically detects and executes alarm calculations/commands,
 * falling back to Gemini conversational intelligence,
 * and executes autonomous actions (Day Plans, Tasks, Roadmaps, Flashcards).
 */
export async function chatWithKratos(text) {
  const lower = (text || '').toLowerCase().trim();

  // 1. Direct Autonomous Command: Full System Wipe / Reset
  const isWipeCommand = (
    (lower.includes('delete') && (lower.includes('everything') || lower.includes('everthing') || lower.includes('all') || lower.includes('fresh'))) ||
    (lower.includes('clear') && (lower.includes('everything') || lower.includes('all'))) ||
    (lower.includes('wipe') && (lower.includes('everything') || lower.includes('all') || lower.includes('clean'))) ||
    (lower.includes('reset') && (lower.includes('everything') || lower.includes('all') || lower.includes('data')))
  );

  if (isWipeCommand) {
    storage.saveTasks([]);
    storage.saveGoals([]);
    storage.saveHabits([]);
    storage.saveSkillCards([]);
    storage.saveDailyPlan({ 
      planDate: new Date().toISOString().split('T')[0], 
      mustWin: '', 
      shouldDo: [], 
      couldDo: [] 
    });
    storage._notifyChange();

    return {
      content: `### ⚔️ FULL OPERATIONAL WIPE EXECUTED\n\nAll tasks, strategic sprints, habits, and flashcards have been completely cleared.\n\nYour PlanX Command Center is reset to a clean slate. What is your first objective?`,
      alarmData: null,
      executedActions: {
        dailyPlan: { mustWin: 'Clean slate initialized' },
        tasks: [],
      },
    };
  }

  // 2. Check for smart alarm command
  const alarmExec = parseAndExecuteAlarmCommand(text);
  if (alarmExec) {
    return {
      content: alarmExec.reply,
      alarmData: alarmExec.alarmData,
      executedActions: null,
    };
  }

  // 3. Conversational AI Execution via Gemini 2.5 Flash
  try {
    const rawReply = await callGemini(text);
    return processKratosReplyAndExecute(rawReply, text);
  } catch (err) {
    console.warn('Gemini call error:', err.message);
    return {
      content: `### ⚠️ TACTICAL DIAGNOSTIC NOTICE\n\nKRATOS could not establish connection with Google AI Studio:\n\n> **${err.message || 'API connection failed'}**\n\n**To resolve:**\n1. Ensure your Gemini API Key in **Config** is valid.\n2. Verify you have active internet connectivity.\n3. Model calibrated: **Gemini 2.5 Flash** (Official DeepMind Flagship).`,
      alarmData: null,
      executedActions: null,
    };
  }
}

function generateOfflineFallback(prompt) {
  storage.incrementAiMetrics(250, false);
  const p = prompt.toLowerCase();

  // If prompt was an alarm request that somehow hit fallback
  const alarmCheck = parseAndExecuteAlarmCommand(prompt);
  if (alarmCheck) {
    return alarmCheck.reply;
  }

  // Full Autonomous Transformation Execution for AI Engineer / Upskill / Roadmap / Day Plan
  if (p.includes('ai') || p.includes('engineer') || p.includes('frontend') || p.includes('roadmap') || p.includes('teach') || p.includes('scratch') || p.includes('upskill')) {
    return `You have 5 years of frontend mastery. That means you already understand state trees, reactivity, distributed clients, and async runtimes. But building interfaces is child's play compared to forging the mind of the machine.

You want to become an AI Engineer by January 1, 2026? 
I have heard enough wishful thinking from average operators. A goal without ruthless execution is a delusion. We do not hope; we conquer.

Here is your 4-phase transformation doctrine:
1. **Mathematics & PyTorch Tensors**: Stop using high-level wrappers until you understand dot-product projections, matrix multiplications, and autograd backpropagation.
2. **Transformers from Scratch**: You will write Self-Attention Query-Key-Value matrix math by hand in raw Python before touching LangChain or HuggingFace.
3. **Inference & Fine-Tuning**: Master LoRA, Quantization (4-bit/8-bit AWQ/GGUF), and Vector Embeddings.
4. **Autonomous AI Systems**: Build agentic evaluation benchmarks and high-throughput production serving.

I have executed tactical commands across your PlanX Command Center:
• 🎯 **Strategic Roadmap**: Forged "90-Day Frontend to AI Engineer Elite Sprint" in your Goals Page.
• ⚔️ **Day 1 Battle Plan**: Non-negotiable Must-Win and 4 supporting objectives deployed to your Today Page.
• 🧠 **Skill Flashcards**: 3 Foundational AI Engineering Memory Cards & code drills forged in your Learn Page.

Look at your screen. Your roadmap, checklist tasks, and memory drills are live. Execute Day 1 now without hesitation.

\`\`\`KRATOS_ACTIONS
{
  "dailyPlan": {
    "mustWin": "Implement Single-Head Attention from scratch in raw Python with Q, K, V matrix math",
    "shouldDo": [
      "PyTorch Tensor operations & Autograd backprop deep dive (60 min)",
      "Solve 1 Medium LeetCode Dynamic Programming / Matrix problem"
    ],
    "couldDo": [
      "Drill 3 AI Engineering flashcards in Learn Page",
      "45-min High-Intensity workout / Cardio flush"
    ],
    "motivation": "The transition from Frontend to AI Engineer is forged in math and execution. Write the attention layer before you sleep."
  },
  "tasks": [
    { "title": "Implement Single-Head Attention from scratch in raw Python with Q, K, V matrix math", "priority": "must_win", "estimatedMinutes": 90, "category": "skills" },
    { "title": "PyTorch Tensor operations & Autograd backprop deep dive", "priority": "should_do", "estimatedMinutes": 60, "category": "skills" },
    { "title": "Solve 1 Medium LeetCode Dynamic Programming / Matrix problem", "priority": "should_do", "estimatedMinutes": 45, "category": "skills" },
    { "title": "Drill 3 AI Engineering flashcards in Learn Page", "priority": "could_do", "estimatedMinutes": 20, "category": "skills" },
    { "title": "45-min High-Intensity workout / Cardio flush", "priority": "could_do", "estimatedMinutes": 45, "category": "health" }
  ],
  "goal": {
    "title": "90-Day Frontend to AI Engineer Elite Sprint",
    "description": "Phase 1: PyTorch & Matrix Math -> Phase 2: Transformer Architecture from scratch -> Phase 3: Fine-Tuning (LoRA/QLoRA) -> Phase 4: Production LLM Systems & Vector Retrieval.",
    "dayTotal": 90,
    "category": "career"
  },
  "habits": [
    { "name": "90-min AI Engineering Deep Work (PyTorch/Transformers)" },
    { "name": "1 LeetCode Problem Solved" }
  ],
  "skillCards": [
    {
      "skill": "AI Engineering",
      "front": "How does Self-Attention mechanism compute Attention(Q, K, V)?",
      "back": "Formula: Attention(Q, K, V) = softmax((Q * K^T) / sqrt(d_k)) * V.\\n1. Dot product of Query & Key measures similarity score.\\n2. Scale by sqrt(d_k) to prevent vanishing gradients.\\n3. Softmax normalizes scores into probability distribution.\\n4. Multiply with Value vectors to obtain context-aware token representation.",
      "actionDrill": "Write the numpy or PyTorch function attention(Q, K, V) without torch.nn.MultiheadAttention."
    },
    {
      "skill": "AI Engineering",
      "front": "What is LoRA (Low-Rank Adaptation) and why is it essential for LLM Fine-Tuning?",
      "back": "Freezes pre-trained model weights W0 (d x k) and injects trainable rank decomposition matrices: W = W0 + (B * A) * (alpha / r), where B is (d x r) and A is (r x k) with rank r << min(d, k).\\nReduces trainable parameters by 99% and enables consumer GPU fine-tuning.",
      "actionDrill": "Calculate parameters for d=4096, k=4096: Full = 16.7M params vs LoRA with r=8: (4096*8 + 8*4096) = 65,536 params (99.6% reduction!)."
    },
    {
      "skill": "AI Engineering",
      "front": "Vector Embeddings: Why use Cosine Similarity instead of Euclidean Distance (L2)?",
      "back": "Cosine similarity measures the angle between two vectors: cos(theta) = (A . B) / (||A|| * ||B||), capturing semantic direction regardless of text length or magnitude.\\nEuclidean distance is sensitive to vector length (longer passages produce larger vectors and appear artificially distant unless normalized).",
      "actionDrill": "Normalize vector [3, 4, 0] by its L2 norm (5) to obtain unit vector [0.6, 0.8, 0] where dot product equals cosine similarity."
    }
  ]
}
\`\`\``;
  }

  if (p.includes('morning') || p.includes('plan')) {
    return `### ⚔️ KRATOS TACTICAL DAY BATTLE PLAN

> The morning belongs to those who take it by force. Weak men negotiate with their alarms; warriors execute. Lock in your Must-Win before noon. No excuses.

#### 🎯 Non-Negotiable Must-Win
* **Complete core architecture sprint & execute 45-min high intensity training** (90 min)

#### ⚡ Core Priorities (Should-Do)
* **Solve 1 Medium LeetCode Dynamic Programming challenge** (45 min)
* **Deep Work: Review production telemetry & system design** (60 min)

#### 🛡️ Bonus Targets (Could-Do)
* **Drill 5 spaced repetition memory cards in Learn Page** (15 min)
* **Review evening reading notes** (20 min)
* **Hydration discipline: reach 3.5 liters**

I have locked this battle plan into your **Today Page** interactive checklist. Execute without hesitation.

\`\`\`KRATOS_ACTIONS
{
  "dailyPlan": {
    "mustWin": "Complete core architecture sprint & execute 45-min high intensity training",
    "shouldDo": [
      "Solve 1 Medium LeetCode Dynamic Programming challenge",
      "Deep Work: Review production telemetry & system design"
    ],
    "couldDo": [
      "Drill 5 spaced repetition memory cards in Learn Page",
      "Review evening reading notes",
      "Hydration discipline: reach 3.5 liters"
    ],
    "motivation": "The morning belongs to those who take it by force. Weak men negotiate with their alarms; warriors execute. Lock in your Must-Win before noon. No excuses."
  },
  "tasks": [
    { "title": "Complete core architecture sprint & execute 45-min high intensity training", "priority": "must_win", "estimatedMinutes": 90, "category": "work" },
    { "title": "Solve 1 Medium LeetCode Dynamic Programming challenge", "priority": "should_do", "estimatedMinutes": 45, "category": "skills" },
    { "title": "Deep Work: Review production telemetry & system design", "priority": "should_do", "estimatedMinutes": 60, "category": "work" },
    { "title": "Drill 5 spaced repetition memory cards in Learn Page", "priority": "could_do", "estimatedMinutes": 15, "category": "skills" },
    { "title": "Review evening reading notes", "priority": "could_do", "estimatedMinutes": 20, "category": "mental" },
    { "title": "Hydration discipline: reach 3.5 liters", "priority": "could_do", "estimatedMinutes": 5, "category": "health" }
  ]
}
\`\`\``;
  }

  if (p.includes('review') || p.includes('score') || p.includes('night')) {
    return `### 🛡️ KRATOS COMBAT DEBRIEF

**Day Combat Score: 87 / 100**

#### 🏆 Battle Victories
* **Maintained uninterrupted streak**
* **Crushed Must-Win priority objective**
* **Zero skipped physical training**

#### ⚠️ Tactical Vulnerabilities
* **Afternoon focus dropped around 3:30 PM**
* **Avoided secondary deep reading block**

> You survived the battlefield and claimed victory on the non-negotiables. But 87 is not 100. You left points on the table through afternoon hesitation. Sleep deep, recover, and attack tomorrow with sharper blades.`;
  }

  const tacticalQuotes = [
    "Hesitation is the enemy of conquest. You already know what needs to be done. Stop looking for motivation and execute through pure discipline.",
    "Your streak is not a trophy — it is armor. Protect it with your life today.",
    "Comfort is a slow death. Lean into the friction. That resistance you feel is where strength is forged.",
    "15 minutes of laser-focused work will shatter hours of anxious overthinking. Stand up and attack the objective.",
    "You have the capability to outperform everyone in your sector if you eliminate distractions for just four continuous hours. Lock the door. Work.",
  ];

  return tacticalQuotes[Math.floor(Math.random() * tacticalQuotes.length)];
}

export async function generateMorningBattlePlan(userGoals = [], context = '') {
  const prompt = `
Generate a fierce, tailored Morning Battle Plan for today.
User Goal / Specific Target: ${context || 'Target: Elite discipline, software engineering, fitness'}
Existing Strategic Goals: ${JSON.stringify(userGoals)}

Format your response STRICTLY as valid JSON with no markdown backticks:
{
  "mustWin": "1 non-negotiable mission critical task tailored to the user's specific target",
  "shouldDo": ["Core priority task 1", "Core priority task 2"],
  "couldDo": ["Bonus upskilling task 1", "Bonus habit task 2"],
  "motivation": "Aggressive, commanding KRATOS directive (2 sentences)"
}
`;

  try {
    const raw = await callGemini(prompt);
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    if (context && (context.toLowerCase().includes('ai') || context.toLowerCase().includes('engineer') || context.toLowerCase().includes('frontend'))) {
      return {
        mustWin: "Implement Single-Head Attention matrix multiplication in raw Python",
        shouldDo: [
          "PyTorch Tensor operations & Autograd backprop deep dive (60 min)",
          "Solve 1 Medium LeetCode Dynamic Programming / Matrix problem"
        ],
        couldDo: [
          "Drill 3 AI Engineering flashcards in Learn Page",
          "45-min High-Intensity workout / Cardio flush"
        ],
        motivation: "From Frontend to AI Engineer is not a title change — it is a combat evolution. Write the attention layer before you sleep."
      };
    }
    return {
      mustWin: "Complete core architecture sprint & execute 45-min high intensity training",
      shouldDo: [
        "Solve 1 Medium LeetCode Dynamic Programming challenge",
        "Deep Work: Review production telemetry & system design"
      ],
      couldDo: [
        "Drill 5 spaced repetition memory cards",
        "Review evening reading notes",
        "Hydration check: reach 3.5 liters"
      ],
      motivation: "The morning belongs to those who take it by force. Weak men negotiate with their alarms; warriors execute. Lock in your Must-Win before noon. No excuses."
    };
  }
}

export async function reviewNightDebrief(completedTasks = [], failedTasks = [], notes = '') {
  const prompt = `
Evaluate the day's performance as KRATOS.
Completed Tasks: ${JSON.stringify(completedTasks)}
Failed/Pending Tasks: ${JSON.stringify(failedTasks)}
User Notes: ${notes}

Format your response STRICTLY as valid JSON with no markdown backticks:
{
  "score": 85,
  "wins": ["win 1", "win 2"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "review": "Blunt, honest KRATOS analysis with direct coaching"
}
`;

  try {
    const raw = await callGemini(prompt);
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    return {
      score: 87,
      wins: [
        "Maintained uninterrupted streak",
        "Crushed Must-Win priority objective",
        "Zero skipped physical training"
      ],
      weaknesses: [
        "Afternoon focus dropped around 3:30 PM",
        "Avoided secondary deep reading block"
      ],
      review: "You survived the battlefield and claimed victory on the non-negotiables. But 87 is not 100. You left points on the table through afternoon hesitation. Sleep deep, recover, and attack tomorrow with sharper blades."
    };
  }
}

export async function forgeStrategicSprint(ambition, preferredDuration = 21) {
  const prompt = `
You are KRATOS. Forge an intense, unyielding Strategic Sprint for this user ambition:
"${ambition}"

Target Sprint Duration: ${preferredDuration} days (usually 21 or 90 days).

Format your response STRICTLY as valid JSON with no markdown backticks:
{
  "title": "${preferredDuration}-Day [Intense Tactical Title]",
  "description": "Clear, uncompromising 2-sentence mission statement of what will be conquered.",
  "durationDays": ${preferredDuration},
  "category": "discipline", // choose from: discipline | career | fitness | skills | mental
  "milestones": [
    "Phase 1 (Day 1-${Math.round(preferredDuration * 0.33)}): Foundation & Shock to the System",
    "Phase 2 (Day ${Math.round(preferredDuration * 0.33) + 1}-${Math.round(preferredDuration * 0.66)}): Deep Execution & Friction Overcoming",
    "Phase 3 (Day ${Math.round(preferredDuration * 0.66) + 1}-${preferredDuration}): Final Conquest & Standard Cemented"
  ],
  "doctrine": "Aggressive, commanding KRATOS quote to burn into the user's mind."
}
`;

  try {
    const raw = await callGemini(prompt);
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn('AI sprint generation fallback:', e.message);
    return {
      title: `${preferredDuration}-Day Relentless Execution Sprint`,
      description: `Complete total immersion into ${ambition}. Zero excuses, zero negotiations with comfort.`,
      durationDays: preferredDuration,
      category: 'discipline',
      milestones: [
        `Phase 1: Build the rhythm and eliminate all daily friction points.`,
        `Phase 2: Double down on daily high-intensity execution.`,
        `Phase 3: Cross the finish line dominant and unbroken.`
      ],
      doctrine: 'The only easy day was yesterday. Commit fully or do not step into the arena.'
    };
  }
}

export async function forgeSkillCard(skillName, userNeed = '') {
  const prompt = `
You are KRATOS. The operator wants to master the skill: "${skillName}".
Specific user requirement / current learning focus: "${userNeed || 'Core execution law and practical breakdown'}".

Break down this skill into an uncompromising, high-impact tactical knowledge drill card:
1. "front": A sharp, provocative concept, formula, or core law that unlocks mastery for this skill (e.g. "The 3-Second Retention Rule", "Idempotency in Distributed APIs", "The Price Anchor in Negotiation", "Color Harmonization in UI").
2. "back": An elite, direct, step-by-step masterclass breakdown of how to execute this principle with zero fluff.
3. "skill": "${skillName}",
4. "actionDrill": "A 5-minute immediate, practical exercise the user can do right now to build muscle memory."

Respond STRICTLY with valid JSON without markdown backticks:
{
  "front": "string",
  "back": "string",
  "skill": "${skillName}",
  "actionDrill": "string"
}
`;

  try {
    const raw = await callGemini(prompt);
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      front: parsed.front || `${skillName}: Core Law`,
      back: parsed.back || `Execute ${skillName} with aggressive consistency.`,
      skill: parsed.skill || skillName,
      domain: parsed.skill || skillName,
      actionDrill: parsed.actionDrill || `Execute 1 practical 5-minute session in ${skillName}.`,
    };
  } catch (e) {
    console.warn('AI skill forge fallback:', e.message);
    return {
      front: `${skillName}: Fundamental Mastery Law`,
      back: `True mastery in ${skillName} comes from isolating the core variable and executing deliberate iterations under pressure. Eliminate distractions and test your skills in real conditions.`,
      skill: skillName,
      domain: skillName,
      actionDrill: `Take 5 minutes right now to apply the core principle of ${skillName}. Write down your result with zero ego.`,
    };
  }
}

/**
 * KRATOS AI Alarm Copilot: Creates, modifies, or generates alarms using natural language.
 * @param {string} instruction - User prompt (e.g. "Add focus alarm at 3:30 PM with Santoor", "Shift wake-up to 5:00 AM")
 * @param {object} currentConfig - Existing alarm settings
 */
export async function aiManageAlarms(instruction, currentConfig = {}) {
  const settings = currentConfig || storage.getAlarmSettings();
  const existingCustom = settings.customAlarms || [];

  const prompt = `
You are KRATOS — Tactical Alarm & Routine Strategist.
The user wants to configure, add, or modify their daily alarms using natural language.

Current Settings:
- Morning Wake-up Alarm: ${settings.wakeAlarmTime || '05:30'} (Enabled: ${settings.wakeAlarmEnabled !== false})
- Night Debrief Alarm: ${settings.nightReviewTime || '21:30'} (Enabled: ${settings.nightReviewAlarmEnabled !== false})
- Global Tone: ${settings.alarmTone || 'bansuri-morning'}
- Custom Alarms: ${JSON.stringify(existingCustom)}

Available Instrument Sound Profiles:
- "bansuri-morning" (🪈 Indian Bansuri - Soothing Bamboo Flute & Tanpura Drone)
- "santoor-sunrise" (🪕 Kashmiri Santoor & Sitar Strings)
- "temple-bell-om" (🔔 Sacred 432Hz Harmonic Meditation Bell)

User Instruction:
"${instruction}"

Your Directives:
1. STRICT RULE: Alarms are exclusively for WAKING UP or when the user EXPLICITLY requests an ALARM.
   - NEVER create alarms for everyday tasks, habits, workouts, or routines. Tasks and habits receive quiet push notifications, NOT continuous ringing audio alarms.
2. If the user specifically asks to set or add an alarm (e.g. "Set alarm for 6:00 AM", "Wake up alarm at 7:00 AM with Bansuri"):
   - Set the alarm with the exact requested time "HH:MM", the requested tone, and a clear title.
3. If the user asks to modify an alarm (e.g. "Change wake time to 05:00", "Change tone to temple bell", "Turn off morning alarm"):
   - Modify only the requested setting.
4. If the user asks to delete or clear alarms (e.g. "Delete all custom alarms", "Clear alarms"):
   - Set customAlarms to [].

Respond STRICTLY with valid JSON without markdown formatting:
{
  "explanation": "Direct 1-sentence confirmation of the alarm change made by KRATOS.",
  "wakeAlarmTime": "${settings.wakeAlarmTime || '05:30'}",
  "wakeAlarmEnabled": true,
  "nightReviewTime": "${settings.nightReviewTime || '21:30'}",
  "nightReviewAlarmEnabled": true,
  "alarmTone": "bansuri-morning",
  "customAlarms": [
    // only if the user EXPLICITLY requested to set a specific alarm
  ]
}
`;

  try {
    const raw = await callGemini(prompt);
    const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      explanation: parsed.explanation || 'KRATOS: Alarm configuration calibrated.',
      wakeAlarmTime: parsed.wakeAlarmTime || settings.wakeAlarmTime || '05:30',
      wakeAlarmEnabled: parsed.wakeAlarmEnabled !== undefined ? parsed.wakeAlarmEnabled : settings.wakeAlarmEnabled,
      nightReviewTime: parsed.nightReviewTime || settings.nightReviewTime || '21:30',
      nightReviewAlarmEnabled: parsed.nightReviewAlarmEnabled !== undefined ? parsed.nightReviewAlarmEnabled : settings.nightReviewAlarmEnabled,
      alarmTone: parsed.alarmTone || settings.alarmTone || 'bansuri-morning',
      customAlarms: Array.isArray(parsed.customAlarms) ? parsed.customAlarms : existingCustom,
    };
  } catch (err) {
    console.warn('AI alarm manager offline fallback:', err.message);

    // Smart Offline Rule-Based Engine
    const lower = instruction.toLowerCase();
    const updated = { ...settings };
    let explanation = 'KRATOS: Alarm settings updated.';

    // Check if user wants to delete/clear custom alarms
    if (lower.includes('delete all') || lower.includes('clear all') || lower.includes('remove all')) {
      updated.customAlarms = [];
      explanation = 'KRATOS: All custom alarms cleared. Only standard wake/night alarms remain.';
      return { ...updated, explanation };
    }

    // Time extraction (e.g. "6am", "6:30 am", "07:00")
    const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    let extractedTime = null;
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const meridiem = timeMatch[3]?.toLowerCase();

      if (meridiem === 'pm' && hours < 12) hours += 12;
      if (meridiem === 'am' && hours === 12) hours = 0;
      extractedTime = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    }

    // Tone preference
    let preferredTone = 'bansuri-morning';
    if (lower.includes('santoor') || lower.includes('sitar') || lower.includes('string')) {
      preferredTone = 'santoor-sunrise';
    } else if (lower.includes('bell') || lower.includes('temple') || lower.includes('chime') || lower.includes('432')) {
      preferredTone = 'temple-bell-om';
    }

    if (lower.includes('wake') && extractedTime) {
      updated.wakeAlarmTime = extractedTime;
      updated.wakeAlarmEnabled = true;
      updated.alarmTone = preferredTone;
      explanation = `KRATOS: Morning wake-up alarm set to ${extractedTime} with ${preferredTone === 'bansuri-morning' ? 'Indian Bansuri Flute' : preferredTone === 'santoor-sunrise' ? 'Kashmiri Santoor' : 'Temple Bell'}.`;
    } else if (extractedTime && (lower.includes('alarm') || lower.includes('set'))) {
      const newAlarm = {
        id: `alm_custom_${Date.now()}`,
        title: lower.includes('wake') ? 'Morning Wake Up' : 'Specific Alarm',
        time: extractedTime,
        enabled: true,
        tone: preferredTone,
        body: 'Rise and execute without delay.',
        tag: 'Alarm',
      };
      updated.customAlarms = [...(updated.customAlarms || []), newAlarm];
      explanation = `KRATOS: Alarm set for ${extractedTime} with ${preferredTone === 'bansuri-morning' ? 'Indian Bansuri Flute' : preferredTone === 'santoor-sunrise' ? 'Kashmiri Santoor' : 'Temple Bell'}.`;
    } else {
      explanation = 'KRATOS: Specify an alarm time (e.g. "Set alarm for 6:00 AM with Bansuri flute"). Task reminders are kept as notifications.';
    }

    return {
      explanation,
      wakeAlarmTime: updated.wakeAlarmTime || '05:30',
      wakeAlarmEnabled: updated.wakeAlarmEnabled !== false,
      nightReviewTime: updated.nightReviewTime || '21:30',
      nightReviewAlarmEnabled: updated.nightReviewAlarmEnabled !== false,
      alarmTone: updated.alarmTone || 'bansuri-morning',
      customAlarms: updated.customAlarms || [],
    };
  }
}



