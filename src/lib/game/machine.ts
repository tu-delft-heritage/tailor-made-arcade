import { assign, setup } from 'xstate'
import { characterIds, type CharacterId, type GameOverReason, type Question, type RoundResult } from './types.ts'
import { moveSelection } from './cabinet.ts'
import type { Direction } from './cabinet.ts'
import { answerPoints, questionForLevel, roundRules } from './scoring.ts'

export const RESULTS_MILLISECONDS = 8000

type GameContext = {
  characterId: CharacterId
  questions: Question[]
  questionIndex: number
  selected: string | null
  score: number
  roundStartScore: number
  level: number
  lastPoints: number
  activeChoice: number
  results: RoundResult[]
  gameOverReason: GameOverReason | null
}

export const gameMachine = setup({
  types: {
    context: {} as GameContext,
    events: {} as { type: 'START' | 'NEXT_GAME'; questions: Question[] } | { type: 'IMAGE_READY' } |
      { type: 'IMAGE_ERROR' } | { type: 'REPLACE_QUESTION'; question: Question } | { type: 'ANSWER'; answer: string; remainingMilliseconds?: number } | { type: 'MOVE'; direction: Direction } |
      { type: 'CONFIRM'; remainingMilliseconds?: number } | { type: 'FINISH' } | { type: 'TIMEOUT'; reason: 'question-time' | 'game-time' } |
      { type: 'HOME' } | { type: 'IDLE' } | { type: 'WAKE' } | { type: 'SHOW_SCORES' } | { type: 'SELECT_TEAM' } | { type: 'CHOOSE_CHARACTER'; characterId: CharacterId } | { type: 'INTRO_DONE' }
  },
  actions: {
    resetCharacter: assign({ characterId: 'charlotte' as const }),
    chooseCharacter: assign(({ event }) => event.type === 'CHOOSE_CHARACTER' ? { characterId: event.characterId } : {}),
    start: assign(({ context, event }) => {
      if (event.type !== 'START' && event.type !== 'NEXT_GAME') return {}
      const level = event.type === 'NEXT_GAME' ? context.level + 1 : 1
      const score = event.type === 'NEXT_GAME' ? context.score : 0
      return { questions: event.questions.map(question => questionForLevel(question, level)), level,
        questionIndex: 0, selected: null, score, roundStartScore: score, lastPoints: 0, activeChoice: 0, results: [], gameOverReason: null }
    }),
    move: assign(({ context, event }) => event.type === 'MOVE'
      ? { activeChoice: moveSelection(context.activeChoice, event.direction) } : {}),
    confirm: assign(({ context, event }) => {
      const question = context.questions[context.questionIndex]
      const selected = question.choices[context.activeChoice]
      const correct = selected === question.answer
      const lastPoints = answerPoints(correct, event.type === 'CONFIRM' ? event.remainingMilliseconds ?? 0 : 0, question.seconds, context.level)
      return { selected, lastPoints, score: context.score + lastPoints, results: [...context.results, correct ? 'correct' : 'wrong'] }
    }),
    answer: assign(({ event, context }) => {
      if (event.type !== 'ANSWER') return {}
      const question = context.questions[context.questionIndex]
      const correct = event.answer === question.answer
      const lastPoints = answerPoints(correct, event.remainingMilliseconds ?? 0, question.seconds, context.level)
      return { selected: event.answer, lastPoints, score: context.score + lastPoints, results: [...context.results, correct ? 'correct' : 'wrong'] }
    }),
    next: assign(({ context }) => ({ questionIndex: context.questionIndex + 1, selected: null, lastPoints: 0, activeChoice: 0 })),
    timeout: assign(({ context, event }) => event.type === 'TIMEOUT' ? {
      results: context.selected === null ? [...context.results, 'timeout' as const] : context.results,
      gameOverReason: event.reason
    } : {}),
    replaceQuestion: assign(({ context, event }) => event.type === 'REPLACE_QUESTION' ? {
      questions: context.questions.map((question, index) => index === context.questionIndex ? questionForLevel(event.question, context.level) : question),
      selected: null, activeChoice: 0
    } : {}),
    imageError: assign({ gameOverReason: 'image' as const }),
    mistakeLimit: assign({ gameOverReason: 'mistakes' as const }),
    loseScore: assign({ score: 0, roundStartScore: 0, lastPoints: 0 }),
    home: assign({ questions: [], questionIndex: 0, selected: null, score: 0, roundStartScore: 0, level: 1, lastPoints: 0, activeChoice: 0,
      results: [], gameOverReason: null })
  },
  guards: {
    tooManyMistakes: ({ context }) => context.results.filter(result => result === 'wrong').length > roundRules(context.level).maxMistakes,
    completedGame: ({ context }) => context.questions.length > 0 && context.results.length === context.questions.length && context.gameOverReason === null,
    validCharacter: ({ event }) => event.type === 'CHOOSE_CHARACTER' && characterIds.includes(event.characterId),
    validAnswer: ({ context, event }) => event.type === 'ANSWER' &&
      Boolean(context.questions[context.questionIndex]?.choices.includes(event.answer)),
    lastQuestion: ({ context }) => context.questionIndex >= context.questions.length - 1
  }
}).createMachine({
  id: 'arcade',
  initial: 'title',
  context: { characterId: 'charlotte', questions: [], questionIndex: 0, selected: null, score: 0, roundStartScore: 0, level: 1, lastPoints: 0, activeChoice: 0,
    results: [], gameOverReason: null },
  on: {
    HOME: { target: '.title', actions: 'home' },
    IDLE: { target: '.idle', actions: 'home' }
  },
  states: {
    idle: { on: { WAKE: 'title' } },
    title: { on: { SELECT_TEAM: 'choosing', SHOW_SCORES: 'scoreboard' } },
    scoreboard: { on: { NEXT_GAME: { guard: 'completedGame', target: 'intro', actions: 'start' } } },
    choosing: { entry: 'resetCharacter', on: {
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
    reveal: { always: { guard: 'tooManyMistakes', target: 'gameOver', actions: 'mistakeLimit' }, on: {
      FINISH: [
        { guard: 'lastQuestion', target: 'results' },
        { target: 'loading', actions: 'next' }
      ],
      TIMEOUT: { target: 'gameOver', actions: 'timeout' }
    } },
    gameOver: { entry: 'loseScore', on: { SELECT_TEAM: 'choosing', SHOW_SCORES: 'scoreboard' } },
    results: { after: { [RESULTS_MILLISECONDS]: 'scoreboard' }, on: {
      NEXT_GAME: { guard: 'completedGame', target: 'intro', actions: 'start' },
      SELECT_TEAM: 'choosing', SHOW_SCORES: 'scoreboard'
    } }
  }
})
