type RoundState = {
  state: unknown
  score: number
  question: { prompt: string; image: string; imageAlt: string; choices: string[]; answer?: string; title?: string } | null
}
type Tool = { name: string; description: string; inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => Promise<RoundState> }
type ModelDocument = Document & {
  modelContext?: { registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void> }
}

/** Optional browser integration; unsupported browsers use the regular interface. */
export function registerArcadeTools(actions: {
  read: () => RoundState; start: () => void; answer: (choice: string) => void; finish: () => void; settle: () => Promise<void>
}) {
  const context = (document as ModelDocument).modelContext
  const lifecycle = new AbortController()
  if (!context) return () => lifecycle.abort()
  const tools: Tool[] = [
    { name: 'get_arcade_round', description: 'Read the visible round, choices, and score. Correct answers appear only after submitting.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: async () => actions.read() },
    { name: 'start_arcade_round', description: 'Start a new eight-question game from the title, results, or game-over screen.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: async () => {
        if (!['title', 'results', 'gameOver'].includes(String(actions.read().state))) throw new Error('Finish the current game first.')
        actions.start(); await actions.settle(); return actions.read()
      } },
    { name: 'submit_arcade_answer', description: 'Submit one of the visible answer labels and reveal the result. This locks the answer and awards points.',
      inputSchema: { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: async input => {
        const answer = input && typeof input === 'object' && 'answer' in input ? input.answer : undefined
        const round = actions.read()
        if (round.state !== 'playing' || typeof answer !== 'string' || !round.question?.choices.includes(answer)) throw new Error('Choose a valid answer while the round is ready.')
        actions.answer(answer); await actions.settle(); return actions.read()
      } },
    { name: 'finish_arcade_round', description: 'Continue from the answer reveal to the next question or final results.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: async () => {
        if (actions.read().state !== 'reveal') throw new Error('Submit an answer first.')
        actions.finish(); await actions.settle(); return actions.read()
      } }
  ]
  for (const tool of tools) {
    try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}) } catch { /* Experimental API. */ }
  }
  return () => lifecycle.abort()
}
