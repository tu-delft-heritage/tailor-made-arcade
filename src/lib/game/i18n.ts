import type { Language } from './types.ts'

export const copy = {
  nl: {
    mission: 'DE VERDWENEN LABELS', selectTeam: 'KIES JE TEAMGENOOT', back: 'TERUG',
    introTitle: 'OEPS!', introHint: 'Help Daphne de labels terug te vinden.', go: 'AAN DE SLAG',
    missionComplete: 'KLAAR!', recovered: 'LABELS TERUG',
    start: 'START', language: 'TAAL', question: 'WELK LABEL HOORT HIER?',
    loading: 'LADEN…', wrong: 'HELAAS!', next: 'VOLGENDE', results: 'UITSLAG',
    highScore: 'HI', playAgain: 'NOG EEN KEER',
    total: 'Totale tijd', round: 'Vraag', progress: 'Voortgang',
    answerLabel: 'Kies een label met de joystick of muis', soundOn: 'GELUID AAN', soundOff: 'GELUID UIT',
    gameOver: 'GAME OVER', questionTime: 'TE LAAT', gameTime: 'TIJD OP', imageError: 'FOTO NIET BESCHIKBAAR',
    retry: 'OPNIEUW', previousPage: 'Vorige pagina', nextPage: 'Volgende pagina'
  },
  en: {
    mission: 'THE LOST LABELS', selectTeam: 'CHOOSE YOUR TEAMMATE', back: 'BACK',
    introTitle: 'OOPS!', introHint: 'Help Daphne put the labels back.', go: 'LET’S GO',
    missionComplete: 'ALL DONE!', recovered: 'LABELS BACK',
    start: 'START', language: 'LANGUAGE', question: 'WHICH LABEL BELONGS HERE?',
    loading: 'LOADING…', wrong: 'OOPS!', next: 'NEXT', results: 'RESULTS',
    highScore: 'HI', playAgain: 'PLAY AGAIN',
    total: 'Total time', round: 'Question', progress: 'Progress',
    answerLabel: 'Choose a label with the joystick or mouse', soundOn: 'SOUND ON', soundOff: 'SOUND OFF',
    gameOver: 'GAME OVER', questionTime: 'TOO LATE', gameTime: 'TIME UP', imageError: 'PHOTO NOT AVAILABLE',
    retry: 'TRY AGAIN', previousPage: 'Previous page', nextPage: 'Next page'
  }
} satisfies Record<Language, Record<string, string>>
