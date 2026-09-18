import { assign, setup } from 'xstate'
import { characterIds, type CharacterId, type GameOverReason, type Question, type RoundResult } from './types.ts'
import { moveSelection } from './cabinet.ts'
import type { Direction } from './cabinet.ts'

type GameContext = {
  characterId: CharacterId
  questions: Question[]
  questionIndex: number
  selected: string | null
  score: number
  activeChoice: number
  results: RoundResult[]
  gameOverReason: GameOverReason | null
}

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as { type: 'START'; questions: Question[] } | { type: 'IMAGE_READY' } |
      { type: 'IMAGE_ERROR' } | { type: 'REPLACE_QUESTION'; question: Question } | { type: 'ANSWER'; answer: string } | { type: 'MOVE'; direction: Direction } |
      { type: 'CONFIRM' } | { type: 'FINISH' } | { type: 'TIMEOUT'; reason: 'question-time' | 'game-time' } |
      { type: 'HOME' } | { type: 'SELECT_TEAM' } | { type: 'CHOOSE_CHARACTER'; characterId: CharacterId } | { type: 'INTRO_DONE' }
  },
  actions: {
    chooseCharacter: assign(({ event }) => event.type === 'CHOOSE_CHARACTER' ? { characterId: event.characterId } : {}),
    start: assign(({ event }) => event.type === 'START' ? {
      questions: event.questions, questionIndex: 0, selected: null, score: 0, activeChoice: 0,
      results: [], gameOverReason: null
    } : {}),
    move: assign(({ context, event }) => event.type === 'MOVE'
      ? { activeChoice: moveSelection(context.activeChoice, event.direction) } : {}),
    confirm: assign(({ context }) => {
      const question = context.questions[context.questionIndex]
      const selected = question.choices[context.activeChoice]
      const correct = selected === question.answer
      return { selected, score: context.score + (correct ? 100 : 0), results: [...context.results, correct ? 'correct' : 'wrong'] }
    }),
    answer: assign(({ event, context }) => {
      if (event.type !== 'ANSWER') return {}
      const question = context.questions[context.questionIndex]
      const correct = event.answer === question.answer
      return { selected: event.answer, score: context.score + (correct ? 100 : 0), results: [...context.results, correct ? 'correct' : 'wrong'] }
    }),
    next: assign(({ context }) => ({ questionIndex: context.questionIndex + 1, selected: null, activeChoice: 0 })),
    timeout: assign(({ context, event }) => event.type === 'TIMEOUT' ? {
      results: context.selected === null ? [...context.results, 'timeout' as const] : context.results,
      gameOverReason: event.reason
    } : {}),
    replaceQuestion: assign(({ context, event }) => event.type === 'REPLACE_QUESTION' ? {
      questions: context.questions.map((question, index) => index === context.questionIndex ? event.question : question),
      selected: null, activeChoice: 0
    } : {}),
    imageError: assign({ gameOverReason: 'image' as const }),
    home: assign({ questions: [], questionIndex: 0, selected: null, score: 0, activeChoice: 0,
      results: [], gameOverReason: null })
  },
  guards: {
    validCharacter: ({ event }) => event.type === 'CHOOSE_CHARACTER' && characterIds.includes(event.characterId),
    validAnswer: ({ context, event }) => event.type === 'ANSWER' &&
      Boolean(context.questions[context.questionIndex]?.choices.includes(event.answer)),
    lastQuestion: ({ context }) => context.questionIndex >= context.questions.length - 1
  }
}).createMachine({
  id: 'arcade',
  initial: 'title',
  context: { characterId: 'daphne', questions: [], questionIndex: 0, selected: null, score: 0, activeChoice: 0,
    results: [], gameOverReason: null },
  on: { HOME: { target: '.title', actions: 'home' } },
  states: {
    title: { on: { SELECT_TEAM: 'choosing' } },
    choosing: { on: {
      CHOOSE_CHARACTER: { guard: 'validCharacter', actions: 'chooseCharacter' },
      START: { target: 'intro', actions: 'start' }
    } },
    intro: { on: { INTRO_DONE: 'loading' } },
    loading: { on: {
      REPLACE_QUESTION: { target: 'loading', reenter: true, actions: 'replaceQuestion' },
      IMAGE_READY: 'playing',
      IMAGE_ERROR: { target: 'gameOver', actions: 'imageError' },
      TIMEOUT: { target: 'gameOver', actions: 'timeout' }
    } },
    playing: { on: {
      MOVE: { actions: 'move' },
      CONFIRM: { target: 'reveal', actions: 'confirm' },
      ANSWER: { guard: 'validAnswer', target: 'reveal', actions: 'answer' },
      IMAGE_ERROR: { target: 'gameOver', actions: 'imageError' },
      TIMEOUT: { target: 'gameOver', actions: 'timeout' }
    } },
    reveal: { on: {
      FINISH: [
        { guard: 'lastQuestion', target: 'results' },
        { target: 'loading', actions: 'next' }
      ],
      TIMEOUT: { target: 'gameOver', actions: 'timeout' }
    } },
    gameOver: { on: { SELECT_TEAM: 'choosing' } },
    results: { on: { SELECT_TEAM: 'choosing' } }
  }
})
