import type { Language } from './types.ts'

export const copy = {
  nl: {
    start: 'DRUK OP GROEN', dedication: 'VOOR DAPHNE', language: 'TAAL', question: 'WAT IS DIT OBJECT?',
    choose: 'KIES', confirm: 'BEVESTIG', loading: 'FOTO LADEN…', correct: 'GOED!', wrong: 'HELAAS!',
    yourChoice: 'JOUW KEUZE', correctAnswer: 'HET JUISTE ANTWOORD', next: 'VOLGENDE', results: 'UITSLAG',
    yourScore: 'JOUW SCORE', highScore: 'HI-SCORE', playAgain: 'NOG EEN KEER', thanks: 'DANK JE, DAPHNE',
    total: 'TOTAAL', round: 'VRAAG', progress: 'Voortgang per vraag', answerLabel: 'Antwoord — kies met de joystick of muis', soundOn: 'GELUID AAN', soundOff: 'GELUID UIT',
    gameOver: 'GAME OVER', questionTime: 'TE LANG GEWACHT', gameTime: 'TOTALE TIJD OP', imageError: 'FOTO NIET BESCHIKBAAR',
    correctCount: 'GOED', retry: 'OPNIEUW'
  },
  en: {
    start: 'PRESS GREEN', dedication: 'FOR DAPHNE', language: 'LANGUAGE', question: 'WHAT IS THIS OBJECT?',
    choose: 'CHOOSE', confirm: 'CONFIRM', loading: 'LOADING PHOTO…', correct: 'CORRECT!', wrong: 'WRONG!',
    yourChoice: 'YOUR CHOICE', correctAnswer: 'THE CORRECT ANSWER', next: 'NEXT', results: 'RESULTS',
    yourScore: 'YOUR SCORE', highScore: 'HI-SCORE', playAgain: 'PLAY AGAIN', thanks: 'THANK YOU, DAPHNE',
    total: 'TOTAL', round: 'QUESTION', progress: 'Progress for each question', answerLabel: 'Answer — choose with the joystick or mouse', soundOn: 'SOUND ON', soundOff: 'SOUND OFF',
    gameOver: 'GAME OVER', questionTime: 'TOO SLOW', gameTime: 'TOTAL TIME UP', imageError: 'PHOTO NOT AVAILABLE',
    correctCount: 'CORRECT', retry: 'TRY AGAIN'
  }
} satisfies Record<Language, Record<string, string>>
