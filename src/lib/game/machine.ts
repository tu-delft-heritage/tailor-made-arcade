import { assign, setup } from 'xstate'
import type { GameOverReason, IdentificationQuestion, RoundResult } from './types.ts'
import { moveSelection } from './cabinet.ts'
import type { Direction } from './cabinet.ts'

type GameContext = {
  questions: IdentificationQuestion[]
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
    events: {} as { type: 'START'; questions: IdentificationQuestion[] } | { type: 'IMAGE_READY' } |
      { type: 'IMAGE_ERROR' } | { type: 'ANSWER'; answer: string } | { type: 'MOVE'; direction: Direction } |
      { type: 'CONFIRM' } | { type: 'FINISH' } | { type: 'TIMEOUT'; reason: 'question-time' | 'game-time' } |
      { type: 'HOME' }
  },
  actions: {
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
    imageError: assign({ gameOverReason: 'image' as const }),
    home: assign({ questions: [], questionIndex: 0, selected: null, score: 0, activeChoice: 0,
      results: [], gameOverReason: null })
  },
  guards: {
    validAnswer: ({ context, event }) => event.type === 'ANSWER' &&
      Boolean(context.questions[context.questionIndex]?.choices.includes(event.answer)),
    lastQuestion: ({ context }) => context.questionIndex >= context.questions.length - 1
  }
}).createMachine({
  id: 'arcade',
  initial: 'title',
  context: { questions: [], questionIndex: 0, selected: null, score: 0, activeChoice: 0,
    results: [], gameOverReason: null },
  on: { HOME: { target: '.title', actions: 'home' } },
  states: {
    title: { on: { START: { target: 'loading', actions: 'start' } } },
    loading: { on: {
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
    gameOver: { on: { START: { target: 'loading', actions: 'start' } } },
    results: { on: { START: { target: 'loading', actions: 'start' } } }
  }
})
