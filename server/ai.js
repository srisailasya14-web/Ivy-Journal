async function providerResponse(system, user) {
  if (!process.env.AI_API_KEY) return null;
  try {
    const response = await fetch(process.env.AI_BASE_URL || 'https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.AI_API_KEY}` }, body: JSON.stringify({ model: process.env.AI_MODEL || 'gpt-4o-mini', temperature: 0.7, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }) });
    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}

const actualYouTubeLinks = {
  python: 'https://www.youtube.com/watch?v=kqtD5dpn9C8',
  javascript: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
  design: 'https://www.youtube.com/watch?v=Zl9Nw8A6Q3I',
  marketing: 'https://www.youtube.com/watch?v=4YQ4WwVQ0eM',
  writing: 'https://www.youtube.com/watch?v=5rS2t0U_ioM',
  wellness: 'https://www.youtube.com/watch?v=6p_yaNFSYao',
  default: 'https://www.youtube.com/results?search_query=learn+with+small+practice+steps',
};

function pickSkillTheme(skill) {
  const text = String(skill || '').toLowerCase();
  if (text.includes('python')) return { title: 'Python Foundations', skillLevel: 'Beginner', durationWeeks: 4, link: actualYouTubeLinks.python, focus: 'python' };
  if (text.includes('javascript') || text.includes('web') || text.includes('react')) return { title: 'JavaScript & Web Basics', skillLevel: 'Beginner', durationWeeks: 5, link: actualYouTubeLinks.javascript, focus: 'javascript' };
  if (text.includes('design') || text.includes('ui') || text.includes('brand')) return { title: 'Design Thinking', skillLevel: 'Beginner', durationWeeks: 4, link: actualYouTubeLinks.design, focus: 'design' };
  if (text.includes('marketing') || text.includes('brand') || text.includes('content')) return { title: 'Marketing Fundamentals', skillLevel: 'Beginner', durationWeeks: 4, link: actualYouTubeLinks.marketing, focus: 'marketing' };
  if (text.includes('write') || text.includes('story') || text.includes('copy')) return { title: 'Writing Practice', skillLevel: 'Beginner', durationWeeks: 4, link: actualYouTubeLinks.writing, focus: 'writing' };
  if (text.includes('well') || text.includes('habit') || text.includes('focus') || text.includes('mindfulness')) return { title: 'Wellness & Focus', skillLevel: 'Beginner', durationWeeks: 3, link: actualYouTubeLinks.wellness, focus: 'wellness' };
  return { title: `Build momentum in ${String(skill || 'your next skill').trim()}`, skillLevel: 'Beginner', durationWeeks: 4, link: actualYouTubeLinks.default, focus: 'default' };
}

export async function generateRoadmap(skill) {
  const cleanSkill = String(skill || 'a new skill').trim() || 'your next skill';
  const theme = pickSkillTheme(cleanSkill);
  const focus = theme.focus;
  const weeks = {
    python: [
      { title: 'Foundations', days: ['Learn the basic syntax and why it matters', 'Read one beginner-friendly tutorial', 'Write a tiny script from memory', 'Practice with 3 small exercises', 'Review the errors you made', 'Document one thing you learned', 'Choose the next concept to explore'] },
      { title: 'Practice', days: ['Create a mini project idea', 'Break it into tiny tasks', 'Implement one small feature', 'Test and debug it carefully', 'Refactor one messy section', 'Learn one new concept each day', 'Celebrate the habit of iteration'] },
      { title: 'Application', days: ['Pick a real problem to solve', 'Sketch a practical solution', 'Build the smallest working version', 'Review the gaps and fix one', 'Write down what surprised you', 'Improve readability and clarity', 'Share the results with someone'] },
      { title: 'Momentum', days: ['Turn your project into a portfolio piece', 'Practice one real-world workflow', 'Document your wins and lessons', 'Add a small improvement', 'Plan the next milestone', 'Repeat the loop with confidence', 'Reflect on your progress'] },
    ],
    javascript: [
      { title: 'Core concepts', days: ['Learn variables, functions, and loops', 'Practice with a tiny challenge each day', 'Read one real example and explain it', 'Build a mini interaction', 'Fix one bug you understand', 'Try a simple event-driven exercise', 'Review what feels easier now'] },
      { title: 'UI thinking', days: ['Study one interface pattern', 'Write a simple component from scratch', 'Add state to a small feature', 'Test how the UI responds', 'Improve one part of the flow', 'Clean up your code', 'Ask what makes it easier to use'] },
      { title: 'Project building', days: ['Choose a simple web idea', 'Plan the sections you need', 'Build the first version quickly', 'Test for edge cases', 'Fix one usability issue', 'Polish the details', 'Share the result'] },
      { title: 'Confidence', days: ['Review your code with a fresh eye', 'Document your wins', 'Choose a next project', 'Refactor one tricky piece', 'Practice explaining the logic', 'Create a sustainable workflow', 'Set your next milestone'] },
    ],
    design: [
      { title: 'Visual language', days: ['Study one design system', 'Collect 3 references that inspire you', 'Learn the role of spacing and contrast', 'Sketch a simple layout', 'Find one rhythm in your composition', 'Refine one idea', 'Review what feels coherent'] },
      { title: 'Exercises', days: ['Create a moodboard', 'Try one landing page concept', 'Redo one layout with better hierarchy', 'Test legibility and balance', 'Experiment with color direction', 'Simplify clutter', 'Choose your favorite iteration'] },
      { title: 'Feedback', days: ['Review your work with fresh eyes', 'Ask what communicates clearly', 'Improve one weak area', 'Test on a different screen size', 'Make one functional improvement', 'Write your design notes', 'Choose your strongest version'] },
      { title: 'Portfolio', days: ['Create a small design artifact', 'Add a clear headline and flow', 'Explain your choices in one paragraph', 'Refine the details', 'Prepare a note for future work', 'Choose one next design challenge', 'Celebrate the process'] },
    ],
    marketing: [
      { title: 'Audience', days: ['Define who you want to reach', 'Identify one real need they have', 'Study one strong example in the field', 'Write a clear value statement', 'Test simple messaging ideas', 'Notice what feels honest', 'Pick one narrow audience focus'] },
      { title: 'Content', days: ['Write one post around a useful insight', 'Create a simple offer', 'Draft one email sequence idea', 'Plan how you will show up', 'Test a call to action', 'Collect feedback', 'Refine your message'] },
      { title: 'Channels', days: ['Pick one channel to grow in', 'Map a weekly content rhythm', 'Set a prompt for each piece', 'Write one draft with clarity', 'Review what is engaging', 'Improve one weak section', 'Commit to a sustainable cadence'] },
      { title: 'Growth', days: ['Measure what is working', 'Double down on one repeated pattern', 'Review your results weekly', 'Write a better offer', 'Test a new angle', 'Set a small next milestone', 'Keep learning without pressure'] },
    ],
    writing: [
      { title: 'Voice', days: ['Write one paragraph in your own voice', 'Notice what feels natural', 'Read a great example for structure', 'Study your strongest sentence', 'Cut anything vague', 'Write a clearer version', 'Keep what feels true'] },
      { title: 'Structure', days: ['Outline an idea before writing', 'Draft a rough version', 'Find the key point in each paragraph', 'Add a stronger opening line', 'Trim repetition', 'Make it easier to follow', 'Read it aloud'] },
      { title: 'Revision', days: ['Edit one draft for clarity', 'Sharpen the message', 'Fix weak transitions', 'Add a useful example', 'Tighten the conclusion', 'Write a cleaner version', 'Keep the feeling you wanted'] },
      { title: 'Momentum', days: ['Write a short piece from memory', 'Practice a weekly rhythm', 'Build a working portfolio sample', 'Share one useful piece', 'Collect feedback lightly', 'Choose a next writing goal', 'Celebrate consistency'] },
    ],
    wellness: [
      { title: 'Reset', days: ['Define your energy baseline', 'Choose one micro-habit that helps', 'Notice what drains you', 'Protect a small recovery window', 'Create a simple ritual', 'Review what helps most', 'Keep your plan gentle'] },
      { title: 'Focus', days: ['Set one meaningful intention', 'Reduce friction before you begin', 'Pick a single task to start', 'Use a short timer to work', 'Pause and reset when needed', 'Reflect on how your body feels', 'Choose a sustainable pace'] },
      { title: 'Consistency', days: ['Repeat the habit for a week', 'Notice what makes it easier', 'Protect the time you need', 'Keep your standard realistic', 'Reflect on what changed', 'Make one tiny improvement', 'Celebrate your steadiness'] },
      { title: 'Growth', days: ['Review the week with honesty', 'Choose one practice to keep', 'Replace one draining habit', 'Set an easier next step', 'Journal one lesson', 'Plan a gentle next phase', 'Remember that progress can be quiet'] },
    ],
    default: [
      { title: 'Direction', days: ['Define the outcome you want', 'Map what success looks like', 'Break the skill into small parts', 'Choose one piece to learn first', 'Set your first, realistic milestone', 'Write down what you are curious about', 'Keep your plan small'] },
      { title: 'Practice', days: ['Learn one core concept', 'Try a hands-on exercise', 'Refine one weak point', 'Ask one better question', 'Repeat the same idea in a new way', 'Review what feels clearer', 'Keep the effort consistent'] },
      { title: 'Application', days: ['Choose a simple challenge', 'Build the smallest version', 'Test what works', 'Improve one helpful detail', 'Ask for feedback if useful', 'Write down what changed', 'Keep momentum alive'] },
      { title: 'Confidence', days: ['Review your progress', 'Choose your next milestone', 'Create a tiny action plan', 'Share your work', 'Document the lessons', 'Set the next habit', 'Celebrate showing up'] },
    ],
  };

  return {
    title: theme.title,
    skillLevel: theme.skillLevel,
    durationWeeks: theme.durationWeeks,
    learningLinks: [
      { label: `${theme.title} overview`, url: theme.link },
      { label: 'Practice with a beginner-friendly walkthrough', url: actualYouTubeLinks.default },
    ],
    weeks: weeks[focus] || weeks.default,
    description: `A practical, sustainable path for learning ${cleanSkill}.`,
  };
}

export async function generateJournalReflection(entry = {}) {
  const title = String(entry.title || 'a recent moment').trim();
  const content = String(entry.content || '').trim();
  const mood = String(entry.mood || 'Good').trim();
  const prompt = `Title: ${title}\nMood: ${mood}\nEntry: ${content || 'No extra details provided.'}`;
  const generated = await providerResponse(
    'You are Ivy, a warm reflection coach. Give a concise, encouraging reflection in 2-3 sentences. Name what the user is feeling, what they noticed, and one gentle next step. Keep the tone calm and practical.',
    prompt,
  );
  if (generated) return generated.trim();

  if (!content) {
    return `You marked this moment as ${mood.toLowerCase()}. The fact that you noticed it matters. A gentle next step is to choose one action that makes the next hour feel a little easier.`;
  }

  const lower = content.toLowerCase();
  const cues = [
    ['overwhelmed', 'stress', 'stuck', 'busy', 'tired'],
    ['excited', 'happy', 'good', 'great', 'celebration'],
    ['frustrated', 'annoyed', 'confused', 'uncertain'],
    ['grateful', 'calm', 'peaceful', 'clear'],
  ];
  const reflectionMap = {
    0: `You are describing a moment that feels heavy, and noticing that is already a useful act of self-awareness. The next step is not to fix everything; choose the smallest action that reduces the pressure a little and let the rest wait for another time.`,
    1: `This entry shows a genuine source of energy and momentum. What stands out is that you noticed what helped, and you can carry that forward by repeating the conditions that made the moment feel alive.`,
    2: `The tension in this entry is useful information rather than a verdict. You are seeing the friction clearly, which means the next useful move is to reduce the scope and choose one plain, manageable step.`,
    3: `This reflection suggests a sense of steadiness and self-trust. You are paying attention to what restores you, and the next kind step is to protect that rhythm so it can keep supporting your work.`,
  };
  for (let i = 0; i < cues.length; i += 1) {
    if (cues[i].some((item) => lower.includes(item))) return reflectionMap[i];
  }

  return `This entry is about ${title.toLowerCase()}, and the strongest signal is that you are noticing what matters. The next useful step is to take one honest action that matches what you wrote, even if it feels modest; that is how real progress starts.`;
}

export async function generateSuggestions(profile = {}) {
  const goal = String(profile.goal || 'your current goal').trim();
  const base = goal && goal !== 'your current goal' ? goal : 'your next meaningful step';
  return [
    { title: `Focus on one win toward ${base}`, description: 'Choose the smallest visible action that moves your work forward.', duration: 20, category: 'Focus', priority: 'Medium', reason: 'Momentum grows when the next step is clear enough to start.' },
    { title: 'Write a short reflection on the day', description: 'Name what felt useful, what felt heavy, and what you can keep.', duration: 8, category: 'Reflection', priority: 'Low', reason: 'Reflection turns activity into understanding.' },
    { title: 'Clear one source of friction', description: 'Set up the task, note, or environment that makes the next step easier.', duration: 10, category: 'Planning', priority: 'Low', reason: 'Lowering friction makes action more likely.' },
  ];
}

export async function answerChat(message, context = {}) {
  const text = String(message || '').trim();
  const generated = await providerResponse(
    'You are Ivy, a practical AI assistant for productivity and learning. Answer the actual user question directly, with concise and relevant guidance. If the request is technical, explain it clearly; if the question is unclear, ask for the missing detail. Avoid motivational filler unless the user asks for encouragement explicitly.',
    `User context: active goal ${context.goal || 'not provided'}. User message: ${text}`,
  );
  if (generated) return generated;

  const lower = text.toLowerCase();
  const goal = context.goal ? ` while keeping “${context.goal}” in view` : '';

  if (lower.includes('react') || lower.includes('javascript') || lower.includes('python')) {
    return `For ${text}, the fastest path is to learn one core concept, then build a tiny example with it. Start with the minimum syntax you need, write a small exercise, debug it, and then repeat the pattern in a project. That creates understanding faster than skimming theory alone${goal}.`;
  }

  if (lower.includes('how to') || lower.includes('what is') || lower.includes('why')) {
    return `The clearest answer is to focus on the direct cause and the practical effect. For ${text}, define the goal, identify the smallest action that creates progress, and test it in a short feedback loop. That gives you an answer you can apply immediately${goal}.`;
  }

  if (lower.includes('goal') || lower.includes('plan') || lower.includes('roadmap')) {
    return `Turn the goal into a sequence: choose the outcome, define the first milestone, break it into one next action, and plan a review check-in. A good plan stays tiny enough to start and clear enough to finish${goal}.`;
  }

  if (lower.includes('stuck') || lower.includes('overwhelmed') || lower.includes('stress')) {
    return `When you feel stuck, reduce the scope before you increase the pressure. Pick the next smallest useful step, clear the friction around it, and give yourself a short window to do only that${goal}.`;
  }

  if (lower.includes('design') || lower.includes('marketing') || lower.includes('writing')) {
    return `Start with a clear message and a concrete audience. Then choose one small action that makes that message easier to understand, whether that is a headline, a draft, or a visual hierarchy. Simple choices usually produce stronger work than more ideas${goal}.`;
  }

  return `A practical answer is to define the actual problem, choose the smallest action that helps solve it, and test that action before adding more complexity. If you want, give me one concrete question and I can turn it into a clearer next step${goal}.`;
}

export async function generateVisionIdeas(title, description) {
  const theme = String(title || 'your next chapter').trim();
  const context = String(description || '').trim();
  return [
    { kind: 'affirmation', content: `I am becoming the person who lives ${theme} with clarity and ease.` },
    { kind: 'keyword', content: context ? `${context.split(' ')[0] || 'clarity'} focus` : 'clarity' },
    { kind: 'keyword', content: 'steady growth' },
    { kind: 'quote', content: context ? `A visual reminder of: ${context}` : 'Small, meaningful steps.' },
    { kind: 'quote', content: 'Build the life that feels honest, warm, and alive.' },
  ];
}
