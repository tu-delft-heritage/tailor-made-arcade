import type { Language } from './types.ts'

export const copy = {
  nl: {
    mission: 'DE VERDWENEN LABELS', selectTeam: 'KIES JE AVATAR', back: 'TERUG',
    introTitle: 'OEPS!', introHint: '{name} liet de labels vallen. Zet ze weer op hun plek!', go: 'AAN DE SLAG',
    wake: 'DRUK OP START', idleAlt: 'Het team rond een tafel met historische instrumenten in het depot.',
    missionComplete: 'KLAAR!', recovered: 'LABELS TERUG',
    start: 'START', language: 'TAAL', question: 'WELK LABEL HOORT HIER?',
    loading: 'LADEN…', correct: 'GOED!', wrong: 'NIET GOED', next: 'VOLGENDE', results: 'UITSLAG',
    scoreboard: 'SCOREBORD', place: 'Plaats', avatar: 'AVATAR', bestScore: 'HIGHSCORE', countdown: 'Nog {seconds} seconden',
    collectionDating: 'DATERING IN DE COLLECTIE', dimensionDiagram: 'Afmetingen in verhouding', flatShape: 'Rechthoek op schaal met twee bekende afmetingen', solidShape: 'Blok op schaal met hoogte, breedte en diepte',
    viewHeritageObject: 'Bekijk dit object op TU Delft Heritage (nieuw tabblad)',
    metadataMistake: 'Fout in de metadata?', emailCurator: 'Mail de conservator',
    playOnline: 'SPEEL ONLINE', viewLiveSite: 'Speel Tailor-Made Arcade online (nieuw tabblad)',
    highScore: 'HI', newHighScore: 'NIEUW RECORD!', playAgain: 'NOG EEN KEER',
    nextRound: 'VOLGENDE RONDE', level: 'RONDE', points: 'PUNTEN', stillPlaying: 'SPEEL JE NOG?', keepPlaying: 'DOORSPELEN', idleReturn: 'Terug naar start over {seconds}s',
    total: 'Totale tijd', round: 'Vraag', progress: 'Voortgang', mistakeLimit: 'MAX. {count} FOUTEN',
    answerLabel: 'Kies een label met de joystick of muis', sound: 'GELUID', soundOn: 'GELUID AAN', soundOff: 'GELUID UIT',
    gameOver: 'GAME OVER', questionTime: 'TE LAAT', gameTime: 'TIJD OP', imageError: 'FOTO NIET BESCHIKBAAR',
    retry: 'OPNIEUW', previousPage: 'Vorige pagina', nextPage: 'Volgende pagina'
  },
  en: {
    mission: 'THE LOST LABELS', selectTeam: 'CHOOSE YOUR AVATAR', back: 'BACK',
    introTitle: 'OOPS!', introHint: '{name} dropped the labels. Put them back!', go: 'LET’S GO',
    wake: 'PRESS START', idleAlt: 'The team gathered around a table of historic instruments in the depot.',
    missionComplete: 'ALL DONE!', recovered: 'LABELS BACK',
    start: 'START', language: 'LANGUAGE', question: 'WHICH LABEL BELONGS HERE?',
    loading: 'LOADING…', correct: 'CORRECT!', wrong: 'INCORRECT', next: 'NEXT', results: 'RESULTS',
    scoreboard: 'HIGH SCORES', place: 'Place', avatar: 'AVATAR', bestScore: 'HIGH SCORE', countdown: '{seconds} seconds left',
    collectionDating: 'COLLECTION DATING', dimensionDiagram: 'Dimensions in proportion', flatShape: 'Rectangle to scale with two known dimensions', solidShape: 'Cuboid to scale with height, width and depth',
    viewHeritageObject: 'View this object on TU Delft Heritage (new tab)',
    metadataMistake: 'Metadata mistake?', emailCurator: 'Email the curator',
    playOnline: 'PLAY ONLINE', viewLiveSite: 'Play Tailor-Made Arcade online (new tab)',
    highScore: 'HI', newHighScore: 'NEW HIGH SCORE!', playAgain: 'PLAY AGAIN',
    nextRound: 'NEXT ROUND', level: 'ROUND', points: 'POINTS', stillPlaying: 'ARE YOU STILL PLAYING?', keepPlaying: 'CONTINUE PLAYING', idleReturn: 'Back to start in {seconds}s',
    total: 'Total time', round: 'Question', progress: 'Progress', mistakeLimit: 'MAX. {count} MISTAKES',
    answerLabel: 'Choose a label with the joystick or mouse', sound: 'SOUND', soundOn: 'SOUND ON', soundOff: 'SOUND OFF',
    gameOver: 'GAME OVER', questionTime: 'TOO LATE', gameTime: 'TIME UP', imageError: 'PHOTO NOT AVAILABLE',
    retry: 'TRY AGAIN', previousPage: 'Previous page', nextPage: 'Next page'
  }
} satisfies Record<Language, Record<string, string>>
