import type { CharacterId, Language } from './types.ts'

export type Teammate = {
  id: CharacterId
  name: string
  color: string
  portrait: string
  quote: Record<Language, string>
}

// Portraits are bundled imports so cabinet image-cache and BASE_PATH builds work too.
const portraits = import.meta.glob('../assets/avatars/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const portrait = (id: CharacterId) => portraits[`../assets/avatars/${id}.png`]

export const team: Teammate[] = [
  { id: 'charlotte', name: 'Charlotte', color: '#f7b574', portrait: portrait('charlotte'),
    quote: { nl: 'Rustig maar. Die labels lopen niet weg.', en: 'Relax. Those labels aren’t going anywhere.' } },
  { id: 'daphne', name: 'Daphne', color: '#f28eb5', portrait: portrait('daphne'),
    quote: { nl: 'Oeps. Samen krijgen we elk label weer op zijn plek.', en: 'Oops. Together we’ll put every label back where it belongs.' } },
  { id: 'anna', name: 'Anna', color: '#77d7ca', portrait: portrait('anna'),
    quote: { nl: 'Ik heb een theorie. Wacht… welke was het ook alweer?', en: 'I have a theory. Wait… which one was it again?' } },
  { id: 'liselotte', name: 'Liselotte', color: '#b8ce86', portrait: portrait('liselotte'),
    quote: { nl: 'Iedereen aan de slag. En daarna: thee.', en: 'Everyone, get to work. And afterwards: tea.' } },
  { id: 'isabel', name: 'Isabel', color: '#f4d891', portrait: portrait('isabel'),
    quote: { nl: 'Geen zorgen, Daphne. We helpen je wel.', en: 'Don’t worry, Daphne. We’ve got you.' } },
  { id: 'cormac', name: 'Cormac', color: '#f194d6', portrait: portrait('cormac'),
    quote: { nl: 'How are you today? Elk label heeft een verhaal.', en: 'How are you today? Every label has a story.' } },
  { id: 'catherine', name: 'Catherine', color: '#b5a4f4', portrait: portrait('catherine'),
    quote: { nl: 'Losse eindjes? Daar maak ik wel iets van.', en: 'Lovely. The collection has entered its abstract phase.' } }
]
