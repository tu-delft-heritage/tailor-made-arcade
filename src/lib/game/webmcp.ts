import { characterIds, type CharacterId } from './types'

type RoundState = {
  state: unknown
  score: number
  level: number
  character: CharacterId
  question: { prompt: string; clue?: string; images?: string[]; image: string; imageAlt: string; choices: string[]; answer?: string; title?: string } | null
}
type Tool = { name: string; description: string; inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => Promise<RoundState> }
type ModelDocument = Document & {
  modelContext?: { registerTool: (tool: Tool, options: { signal: AbortSignal }) => void | Promise<void> }
}

/** Optional browser integration; unsupported browsers use the regular interface. */
export function registerArcadeTools(actions: {
  read: () => RoundState; selectTeam: () => void; chooseCharacter: (id: CharacterId) => void;
  start: () => void; finishIntro: () => void; answer: (choice: string) => void; finish: () => void; settle: () => Promise<void>
}) {
  const context = (document as ModelDocument).modelContext
  const lifecycle = new AbortController()
  if (!context) return () => lifecycle.abort()
  const tools: Tool[] = [
    { name: 'get_arcade_round', description: 'Read the visible round, choices, and score. Correct answers appear only after submitting.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: async () => actions.read() },
    { name: 'start_arcade_round', description: 'Open avatar selection from the idle, title, results, or game-over screen. Choose an avatar before beginning the mission.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: async () => {
        if (!['idle', 'title', 'results', 'gameOver'].includes(String(actions.read().state))) throw new Error('Finish the current game first.')
        actions.selectTeam(); await actions.settle(); return actions.read()
      } },
    { name: 'choose_arcade_teammate', description: 'Select a teammate and begin The Lost Labels mission. Every teammate has the same scoring and difficulty.',
      inputSchema: { type: 'object', properties: { character: { type: 'string', enum: characterIds } }, required: ['character'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: async input => {
        const character = input && typeof input === 'object' && 'character' in input ? input.character : undefined
        if (actions.read().state !== 'choosing' || !characterIds.includes(character as CharacterId)) throw new Error('Open teammate selection and choose a valid character.')
        actions.chooseCharacter(character as CharacterId); actions.start(); await actions.settle(); return actions.read()
      } },
    { name: 'continue_arcade_intro', description: 'Skip the opening label spill and load the first object. The opening also advances automatically.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: async () => {
        if (actions.read().state !== 'intro') throw new Error('The opening is not active.')
        actions.finishIntro(); await actions.settle(); return actions.read()
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
