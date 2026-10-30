<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { base } from '$app/paths'
  import { env } from '$env/dynamic/public'
  import { useMachine } from '@xstate/svelte'
  import data from '$lib/data/game-data.json'
  import QuestionScene from '$lib/components/QuestionScene.svelte'
  import AnswerChoices from '$lib/components/AnswerChoices.svelte'
  import GameHud from '$lib/components/GameHud.svelte'
  import TeamAvatar from '$lib/components/TeamAvatar.svelte'
  import DepotScene from '$lib/components/DepotScene.svelte'
  import LabelSpill from '$lib/components/LabelSpill.svelte'
  import StoryArtwork from '$lib/components/StoryArtwork.svelte'
  import ScoreTable from '$lib/components/ScoreTable.svelte'
  import ObjectQr from '$lib/components/ObjectQr.svelte'
  import SiteMeta from '$lib/components/SiteMeta.svelte'
  import { team } from '$lib/game/team'
  import { cabinetKeys, joystickDirection, descriptionPages, moveTeammate } from '$lib/game/cabinet'
  import type { Direction } from '$lib/game/cabinet'
  import { copy } from '$lib/game/i18n'
  import { gameMachine } from '$lib/game/machine'
  import { createInactivityTimer, IDLE_MILLISECONDS, IDLE_WARNING_MILLISECONDS } from '$lib/game/inactivity'
  import { SCOREBOARD_KEY, MAX_SCORE, isNewHighScore, parseScoreboard, readScoreboard, recordHighScore } from '$lib/game/scoreboard'
  import { LANGUAGE_KEY, bestScoreKey, migrateStoredPreferences } from '$lib/game/storage'
  import { GAME_SECONDS, QUESTION_SECONDS, roundRules } from '$lib/game/scoring'
  import { endingQuote } from '$lib/game/endings'
  import { createVictoryDeck, type VictoryScene } from '$lib/game/victory-scenes'
  import { victoryArt } from '$lib/game/victory-art'
  import { createBossDeck, type BossScene } from '$lib/game/boss-scenes'
  import { bossArt } from '$lib/game/boss-art'
  import { formatDate } from '$lib/game/dates'
  import { metadataReportMailto } from '$lib/game/metadata-report'
  import { createQuestionBank, createSession, questionObjects, replacementQuestion } from '$lib/game/questions'
  import type { CharacterId, GameData, GameObject, Language, Question } from '$lib/game/types'
  import { registerArcadeTools } from '$lib/game/webmcp'

  const SESSION_LENGTH = 10
  let questionBank: Question[] = []
  let failedObjects = new Set<string>()
  let imageRetries = 0
  const cabinetMode = ['1', 'true', 'yes'].includes(String(env.PUBLIC_CABINET ?? '').toLowerCase())
  const configuredImageBase = String(env.PUBLIC_OBJECT_IMAGE_BASE ?? '').trim().replace(/\/$/, '')
  const { snapshot, send, actorRef } = useMachine(gameMachine)
  const questions = $derived($snapshot.context.questions)
  const questionIndex = $derived($snapshot.context.questionIndex)
  const question = $derived(questions[questionIndex] ?? null)
  const score = $derived($snapshot.context.score)
  const level = $derived($snapshot.context.level)
  const rules = $derived(roundRules(level))
  const canContinueRound = $derived(($snapshot.matches('results') || $snapshot.matches('scoreboard')) &&
    questions.length > 0 && $snapshot.context.results.length === questions.length && $snapshot.context.gameOverReason === null)
  const selected = $derived($snapshot.context.selected)
  const correct = $derived(Boolean(selected && selected === question?.answer))
  const playing = $derived($snapshot.matches('playing'))
  const character = $derived(team.find(member => member.id === $snapshot.context.characterId) ?? team[0])
  let language = $state<Language>('nl')
  const text = $derived(copy[language])
  const endingLine = $derived(endingQuote({ ...$snapshot.context, questionCount: questions.length }, language))
  const pages = $derived(descriptionPages(question?.explanation ?? '', question?.answerObjectId ? 100 : 140))
  let best = $state(0)
  let scores = $state(parseScoreboard(null))
  let recordToBeat = $state(0)
  const newHighScore = $derived(($snapshot.matches('results') || $snapshot.matches('scoreboard')) &&
    $snapshot.context.gameOverReason === null && isNewHighScore(score, recordToBeat))
  let homeChoice = $state(0)
  const highestScore = $derived(Math.max(best, ...Object.values(scores)))
  let storageReady = $state(false)
  let screenHeading = $state<HTMLElement>()
  let teamRoster = $state<HTMLDivElement>()
  let photoTimer: ReturnType<typeof setTimeout> | undefined
  let timerInterval: ReturnType<typeof setInterval> | undefined
  let noticeTimer: ReturnType<typeof setTimeout> | undefined
  let introTimer: ReturnType<typeof setTimeout> | undefined
  let inactivity: ReturnType<typeof createInactivityTimer> | undefined
  let idleWarningSeconds = $state<number | null>(null)
  let idleWarningDeadline = 0
  let idleContinue = $state<HTMLButtonElement>()
  let introReady = $state(false)
  let spillKey = $state(0)
  let victoryScene = $state<VictoryScene>('motorcycle')
  let victoryDeck: VictoryScene[] = []
  let bossScene = $state<BossScene>('instruments')
  let bossDeck: BossScene[] = []
  const sceneIndex = $derived($snapshot.matches('choosing') ? 1 : $snapshot.matches('results') ? 2 : questionIndex % 3)
  const storyScene = $derived($snapshot.matches('idle') ? 'idle' : $snapshot.matches('gameOver') ? 'gameOver' : $snapshot.matches('results') ? 'results' : null)
  let totalDeadline = $state(0)
  let questionDeadline = $state(0)
  let totalMillisecondsLeft = GAME_SECONDS * 1000
  let timerNow = $state(0)
  let totalRemaining = $state(GAME_SECONDS)
  let questionRemaining = $state(QUESTION_SECONDS)
  const countdownRemaining = $derived(playing && questionDeadline && totalDeadline ? Math.max(0, Math.min(questionDeadline, totalDeadline) - timerNow) : null)
  const countdownLabel = $derived(!playing || totalRemaining <= questionRemaining ? text.total : text.round)
  let sound = $state(true)
  let zoom = $state(1)
  let descriptionPage = $state(0)
  let soundNotice = $state('')
  let lastJoystickMove = 0
  let audioContext: AudioContext | undefined
  const scoreText = (number: number) => String(number).padStart(4, '0')

  function recordActivity() {
    const asleep = actorRef.getSnapshot().matches('idle')
    const warned = idleWarningSeconds !== null
    idleWarningSeconds = null
    idleWarningDeadline = 0
    inactivity?.reset()
    if (asleep) send({ type: 'WAKE' })
    if (warned) void tick().then(() => screenHeading?.focus({ preventScroll: true }))
    return asleep || warned
  }

  function imageUrl(object: GameObject) {
    if (!configuredImageBase) return object.imageRemote
    if (/^https?:\/\//.test(configuredImageBase)) return `${configuredImageBase}/${object.id}.jpg`
    const directory = configuredImageBase.replace(/^\.\//, '').replace(/^\//, '')
    return `${base}/${directory}/${object.id}.jpg`.replace(/\/+/g, '/')
  }

  function scoreStorage() { try { return window.localStorage } catch { return undefined } }
  function loadBest() {
    try {
      const stored = Number(localStorage.getItem(bestScoreKey(language)))
      best = Number.isInteger(stored) && stored >= 0 && stored <= MAX_SCORE ? stored : 0
    } catch { best = 0 }
  }
  function chooseLanguage(next: Language) {
    recordActivity()
    if (!$snapshot.matches('title')) return
    language = next
    try { localStorage.setItem(LANGUAGE_KEY, next) } catch { /* Preference is optional. */ }
    if (storageReady) loadBest()
  }
  function showScoreboard() {
    recordActivity()
    send({ type: 'SHOW_SCORES' })
  }
  function goHome() { recordActivity(); homeChoice = 0; send({ type: 'HOME' }) }
  function selectTeam() {
    recordActivity()
    if (!['title', 'results', 'gameOver'].includes(String(actorRef.getSnapshot().value))) return
    totalDeadline = 0
    questionDeadline = 0
    send({ type: 'SELECT_TEAM' })
  }
  function chooseCharacter(characterId: CharacterId) { recordActivity(); send({ type: 'CHOOSE_CHARACTER', characterId }) }
  function moveCharacter(direction: Direction) {
    const index = team.findIndex(member => member.id === character.id)
    const columns = teamRoster ? getComputedStyle(teamRoster).gridTemplateColumns.split(' ').length : 5
    chooseCharacter(team[moveTeammate(index, direction, columns, team.length)].id)
  }
  function finishIntro() {
    clearTimeout(introTimer)
    if (actorRef.getSnapshot().matches('intro')) send({ type: 'INTRO_DONE' })
  }

  onMount(() => {
    migrateStoredPreferences(scoreStorage())
    try {
      const storedLanguage = localStorage.getItem(LANGUAGE_KEY)
      if (storedLanguage === 'nl' || storedLanguage === 'en') language = storedLanguage
    } catch { /* Play still works without browser storage. */ }
    storageReady = true
    loadBest()
    scores = readScoreboard(scoreStorage())
    const syncScores = (event: StorageEvent) => {
      if (event.key === SCOREBOARD_KEY || event.key === null) scores = readScoreboard(scoreStorage())
    }
    window.addEventListener('storage', syncScores)
    timerInterval = setInterval(updateTimers, 100)
    inactivity = createInactivityTimer(() => {
      totalDeadline = 0
      questionDeadline = 0
      soundNotice = ''
      idleWarningSeconds = null
      idleWarningDeadline = 0
      send({ type: 'IDLE' })
    }, IDLE_MILLISECONDS, () => {
      if (!actorRef.getSnapshot().matches('reveal')) return
      idleWarningDeadline = performance.now() + IDLE_WARNING_MILLISECONDS
      idleWarningSeconds = IDLE_WARNING_MILLISECONDS / 1000
    })
    let lastPointerMove = 0
    let suppressWakeClick = false
    const pointerActivity = (event: PointerEvent) => {
      // Keep the warning mounted until click, so dismissing it cannot swallow the next action.
      if (idleWarningSeconds !== null) return
      if (event.type === 'pointermove') {
        if (performance.now() - lastPointerMove < 500) return
        lastPointerMove = performance.now()
      }
      if (recordActivity() && event.type === 'pointerdown') {
        suppressWakeClick = true
        event.preventDefault()
        event.stopImmediatePropagation()
      }
    }
    const consumeWakeClick = (event: MouseEvent) => {
      if (idleWarningSeconds !== null) {
        recordActivity()
        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }
      if (!suppressWakeClick) return
      suppressWakeClick = false
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    window.addEventListener('pointerdown', pointerActivity, true)
    window.addEventListener('pointermove', pointerActivity)
    window.addEventListener('click', consumeWakeClick, true)
    const disposeTools = registerArcadeTools({
      read: () => {
        const state = actorRef.getSnapshot()
        const current = state.context.questions[state.context.questionIndex]
        const revealed = state.matches('reveal') || state.matches('results')
        return { state: state.value, score: state.context.score, level: state.context.level, character: state.context.characterId,
          question: current ? { prompt: current.prompt, clue: current.clue,
            images: questionObjects(current).map(o => imageUrl(o)),
            image: imageUrl(current.object), imageAlt: current.object.imageAlt[current.language] ?? '',
            choices: current.choices,
            ...(revealed ? { answer: current.answer, title: current.object.title } : {}) } : null }
      },
      selectTeam, chooseCharacter, start, finishIntro: () => { recordActivity(); finishIntro() }, answer: submitAnswer, finish: continueGame, settle: tick
    })
    return () => {
      disposeTools()
      clearInterval(timerInterval)
      clearTimeout(photoTimer)
      clearTimeout(noticeTimer)
      clearTimeout(introTimer)
      inactivity?.stop()
      window.removeEventListener('pointerdown', pointerActivity, true)
      window.removeEventListener('pointermove', pointerActivity)
      window.removeEventListener('click', consumeWakeClick, true)
      window.removeEventListener('storage', syncScores)
      void audioContext?.close()
    }
  })

  $effect(() => {
    if (idleWarningSeconds !== null) idleContinue?.focus({ preventScroll: true })
  })
  $effect(() => {
    if ($snapshot.matches('results') && victoryDeck[0] === victoryScene) victoryDeck.shift()
  })
  $effect(() => {
    if ($snapshot.matches('gameOver') && bossDeck[0] === bossScene) bossDeck.shift()
  })
  $effect(() => {
    if ($snapshot.matches('results') && storageReady && score > scores[character.id]) {
      scores = recordHighScore(scores, character.id, score, scoreStorage())
    }
    if ($snapshot.matches('results') && storageReady && score > best) {
      best = score
      try { localStorage.setItem(bestScoreKey(language), String(best)) } catch { /* Optional local record. */ }
    }
  })
  $effect(() => {
    const state = $snapshot.value
    if (state !== 'loading') screenHeading?.focus({ preventScroll: true })
  })
  $effect(() => {
    if ($snapshot.matches('loading')) {
      const current = question
      if (!current) return
      photoTimer = setTimeout(() => imageError(current.id), 12_000)
      return () => clearTimeout(photoTimer)
    }
  })
  $effect(() => {
    if ($snapshot.matches('intro') && introReady) {
      introTimer = setTimeout(finishIntro, 4200)
      return () => clearTimeout(introTimer)
    }
  })

  $effect(() => {
    if ($snapshot.matches('choosing')) {
      const image = new Image()
      image.src = character.shockedPortrait
    }
  })

  $effect(() => {
    if (!playing) return
    const next = questions[questionIndex + 1]
    if (next) questionObjects(next).forEach(object => { const image = new Image(); image.src = imageUrl(object) })
  })

  function updateTimers() {
    if (idleWarningDeadline) idleWarningSeconds = Math.max(0, Math.ceil((idleWarningDeadline - performance.now()) / 1000))
    const state = actorRef.getSnapshot()
    if (!state.matches('playing')) return
    const now = performance.now()
    timerNow = now
    if (totalDeadline) {
      totalMillisecondsLeft = Math.max(0, totalDeadline - now)
      totalRemaining = Math.ceil(totalMillisecondsLeft / 1000)
      if (totalRemaining === 0) {
        totalDeadline = 0
        questionDeadline = 0
        send({ type: 'TIMEOUT', reason: 'game-time' })
        beep(false)
        return
      }
    }
    if (state.matches('playing') && questionDeadline) {
      questionRemaining = Math.max(0, Math.ceil((questionDeadline - now) / 1000))
      if (questionRemaining === 0) {
        questionDeadline = 0
        totalDeadline = 0
        send({ type: 'TIMEOUT', reason: 'question-time' })
        beep(false)
      }
    }
  }

  function beep(success = true) {
    if (!sound) return
    try {
      audioContext ??= new AudioContext()
      void audioContext.resume()
      const oscillator = audioContext.createOscillator()
      const gain = audioContext.createGain()
      oscillator.type = 'square'
      oscillator.frequency.setValueAtTime(success ? 523 : 196, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(success ? 784 : 147, audioContext.currentTime + 0.08)
      gain.gain.setValueAtTime(0.035, audioContext.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.22)
      oscillator.connect(gain)
      gain.connect(audioContext.destination)
      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.23)
    } catch { /* Audio is optional. */ }
  }
  function toggleSound() {
    recordActivity()
    sound = !sound
    clearTimeout(noticeTimer)
    soundNotice = $snapshot.matches('title') && !cabinetMode ? '' : sound ? text.soundOn : text.soundOff
    if (soundNotice) noticeTimer = setTimeout(() => { soundNotice = '' }, 1200)
    if (sound) beep()
  }
  function enterFullscreen() {
    if (cabinetMode && !document.fullscreenElement && document.fullscreenEnabled) {
      void document.documentElement.requestFullscreen().catch(() => {})
    }
  }
  function start() { beginGame(false) }
  function nextRound() { beginGame(true) }
  function beginGame(continuing: boolean) {
    recordActivity()
    if (continuing ? !canContinueRound : !actorRef.getSnapshot().matches('choosing')) return
    enterFullscreen()
    spillKey += 1
    introReady = false
    zoom = 1
    descriptionPage = 0
    recordToBeat = Math.max(scores[character.id], readScoreboard(scoreStorage())[character.id])
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]
    if (!victoryDeck.length) victoryDeck = createVictoryDeck(seed, victoryScene)
    victoryScene = victoryDeck[0]
    const victoryImage = new Image()
    victoryImage.src = victoryArt[victoryScene]
    if (!bossDeck.length) bossDeck = createBossDeck(seed, bossScene)
    bossScene = bossDeck[0]
    const bossImage = new Image()
    bossImage.src = bossArt[bossScene]
    questionBank = createQuestionBank(data as GameData, language)
    failedObjects = new Set()
    imageRetries = 0
    const mission = createSession(questionBank, seed, SESSION_LENGTH)
    send({ type: continuing ? 'NEXT_GAME' : 'START', questions: mission })
    const state = actorRef.getSnapshot()
    totalRemaining = roundRules(state.context.level).totalSeconds
    totalMillisecondsLeft = totalRemaining * 1000
    questionRemaining = state.context.questions[0].seconds
    totalDeadline = 0
    questionDeadline = 0
    beep()
  }
  function imageReady(id: string) {
    const state = actorRef.getSnapshot()
    if (!state.matches('loading') || state.context.questions[state.context.questionIndex]?.id !== id) return
    clearTimeout(photoTimer)
    send({ type: 'IMAGE_READY' })
    if (actorRef.getSnapshot().matches('playing')) {
      timerNow = performance.now()
      totalDeadline = timerNow + totalMillisecondsLeft
      questionRemaining = question?.seconds ?? QUESTION_SECONDS
      questionDeadline = timerNow + questionRemaining * 1000
    }
  }
  function imageError(id: string) {
    const state = actorRef.getSnapshot()
    const current = state.context.questions[state.context.questionIndex]
    if (!state.matches('loading') || current?.id !== id) return
    clearTimeout(photoTimer)
    questionObjects(current).forEach(o => failedObjects.add(o.id))
    const replacement = imageRetries++ < 12 ? replacementQuestion(questionBank, state.context.questions, failedObjects, current.kind) : undefined
    if (replacement) {
      send({ type: 'REPLACE_QUESTION', question: replacement })
      questionRemaining = actorRef.getSnapshot().context.questions[state.context.questionIndex].seconds
      return
    }
    totalDeadline = 0
    questionDeadline = 0
    send({ type: 'IMAGE_ERROR' })
  }
  function submitAnswer(value: string) {
    recordActivity()
    if (!playing || !question || !question.choices.includes(value)) return
    // Settle elapsed time before accepting an answer, then freeze both clocks.
    updateTimers()
    if (!actorRef.getSnapshot().matches('playing')) return
    const remainingMilliseconds = Math.max(0, questionDeadline - timerNow)
    totalDeadline = 0
    questionDeadline = 0
    beep(value === question.answer)
    send({ type: 'ANSWER', answer: value, remainingMilliseconds })
  }
  function confirmAnswer() {
    if (!playing || !question) return
    const value = question.choices[$snapshot.context.activeChoice]
    zoom = 1
    submitAnswer(value)
  }
  function continueGame() {
    if (recordActivity()) return
    if (!$snapshot.matches('reveal')) return
    zoom = 1
    descriptionPage = 0
    questionRemaining = QUESTION_SECONDS
    questionDeadline = 0
    send({ type: 'FINISH' })
    questionRemaining = actorRef.getSnapshot().context.questions[actorRef.getSnapshot().context.questionIndex]?.seconds ?? QUESTION_SECONDS
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (recordActivity()) { event.preventDefault(); return }
    if (event.key === 'Enter' && event.target instanceof HTMLAnchorElement) return
    if (event.key === 'Escape' && $snapshot.matches('scoreboard')) { event.preventDefault(); goHome(); return }
    const direction = joystickDirection(event.code)
    const buttonCode = event.key === 'Enter' ? cabinetKeys.submit
      : event.key === '+' ? cabinetKeys.zoomIn
      : event.key === '-' ? cabinetKeys.zoomOut
      : event.code
    const isButton = Object.values(cabinetKeys).some(code => code === buttonCode)
    if (!direction && !isButton) return
    event.preventDefault()
    if (event.repeat && !direction) return
    if (direction) {
      const now = performance.now()
      if (event.repeat && now - lastJoystickMove < 160) return
      lastJoystickMove = now
      if ($snapshot.matches('title') && (direction === 'left' || direction === 'right')) {
        chooseLanguage(language === 'nl' ? 'en' : 'nl')
      } else if ($snapshot.matches('title')) {
        homeChoice = direction === 'down' ? 1 : 0
        screenHeading?.focus({ preventScroll: true })
      } else if ($snapshot.matches('choosing')) {
        moveCharacter(direction)
        screenHeading?.focus({ preventScroll: true })
      } else if (playing) {
        send({ type: 'MOVE', direction })
        screenHeading?.focus({ preventScroll: true })
      }
      else if ($snapshot.matches('reveal')) {
        const delta = direction === 'right' || direction === 'down' ? 1 : -1
        descriptionPage = Math.max(0, Math.min(pages.length - 1, descriptionPage + delta))
      }
      return
    }
    if (buttonCode === cabinetKeys.toggle) {
      toggleSound()
      return
    }
    if (buttonCode === cabinetKeys.zoomIn || buttonCode === cabinetKeys.zoomOut) {
      if (playing || $snapshot.matches('reveal')) {
        zoom = Math.max(1, Math.min(2.5, zoom + (buttonCode === cabinetKeys.zoomIn ? 0.25 : -0.25)))
      }
      return
    }
    if (buttonCode === cabinetKeys.submit) {
      // Native focused buttons keep their Enter action (back, language, teammate).
      if (event.key === 'Enter' && event.target instanceof HTMLButtonElement) { event.target.click(); return }
      if ($snapshot.matches('title')) { if (homeChoice === 1) showScoreboard(); else selectTeam() }
      else if ($snapshot.matches('scoreboard')) { if (canContinueRound) nextRound(); else goHome() }
      else if ($snapshot.matches('results')) showScoreboard()
      else if ($snapshot.matches('gameOver')) selectTeam()
      else if ($snapshot.matches('choosing')) start()
      else if ($snapshot.matches('intro')) finishIntro()
      else if (playing) confirmAnswer()
      else if ($snapshot.matches('reveal')) continueGame()
    }
  }
</script>

<SiteMeta />
<svelte:head>
  {#each team as member}
    <link rel="preload" as="image" href={member.portrait} fetchpriority="low" />
  {/each}
</svelte:head>
<svelte:window onkeydown={handleKeydown} />

<main class="cabinet" class:cabinet-mode={cabinetMode}>
  <div class="screen" data-scene={sceneIndex} data-state={$snapshot.value} class:menu-scene={$snapshot.matches('title') || $snapshot.matches('choosing') || $snapshot.matches('scoreboard')}>
    <DepotScene variant={sceneIndex} />
    {#if storyScene === 'idle'}<StoryArtwork scene="idle" idleAlt={text.idleAlt} />{/if}
    {#if questions.length && !storyScene && !$snapshot.matches('title') && !$snapshot.matches('choosing') && !$snapshot.matches('scoreboard') && (!$snapshot.matches('intro') || introReady)}
      {#key spillKey}<LabelSpill />{/key}
    {/if}
    {#if soundNotice}<div class="sound-notice" role="status">{soundNotice}</div>{/if}
    {#if $snapshot.matches('reveal')}<div class="answer-feedback-frame" class:correct class:wrong={!correct} aria-hidden="true"></div>{/if}
    {#if $snapshot.matches('idle')}
      <section inert={idleWarningSeconds !== null} class="idle-screen">
        <h1 class="idle-title" bind:this={screenHeading} tabindex="-1">TAILOR-MADE<span>ARCADE</span></h1>
        <button type="button" class="nes-btn cabinet-prompt start-prompt" onclick={() => recordActivity()}><span class="physical-button green"></span>{text.wake}</button>
      </section>
    {:else if $snapshot.matches('title')}
      <section inert={idleWarningSeconds !== null} class="attract-screen">
        <p class="high-score">{text.highScore} {scoreText(highestScore)}</p>
        <div class="title-copy">
          <h1 class="arcade-title" bind:this={screenHeading} tabindex="-1">TAILOR-MADE<span>ARCADE</span></h1>
          <p class="mission-tag">{text.mission}</p>
        </div>
        <div class="home-actions">
          <button type="button" class="nes-btn cabinet-prompt start-prompt" class:menu-selected={homeChoice === 0} onclick={selectTeam}>
            <span class="physical-button green"></span>{text.start}
          </button>
          <button type="button" class="nes-btn scoreboard-link" class:menu-selected={homeChoice === 1} onclick={showScoreboard}>{text.scoreboard}</button>
        </div>
        <div class="home-settings">
          <div class="language-switch" aria-label={text.language}>
            <button type="button" class="nes-btn" class:is-primary={language === 'nl'} aria-pressed={language === 'nl'} onclick={() => chooseLanguage('nl')}>NL</button>
            <button type="button" class="nes-btn" class:is-primary={language === 'en'} aria-pressed={language === 'en'} onclick={() => chooseLanguage('en')}>EN</button>
          </div>
          {#if !cabinetMode}
            <button type="button" class="nes-btn sound-toggle" class:is-primary={sound} role="switch" aria-checked={sound} aria-label={text.sound} onclick={toggleSound}>
              <svg viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges">
                <path fill="currentColor" d="M1 6h3V4h2V2h2v12H6v-2H4v-2H1z" />
                {#if sound}
                  <path fill="currentColor" d="M10 5h2v6h-2zM13 3h2v10h-2z" />
                {:else}
                  <path fill="currentColor" d="M10 5h2v2h2V5h2v2h-2v2h2v2h-2V9h-2v2h-2V9h2V7h-2z" />
                {/if}
              </svg>
              {sound ? text.soundOn : text.soundOff}
            </button>
          {/if}
        </div>
      </section>
    {:else if $snapshot.matches('scoreboard')}
      <section inert={idleWarningSeconds !== null} class="scoreboard-screen">
        <h1 class="screen-title" bind:this={screenHeading} tabindex="-1">{text.scoreboard}</h1>
        <ScoreTable {scores} {language} recordCharacter={newHighScore ? character.id : null} />
        <div class="scoreboard-actions">
          <button type="button" class="nes-btn back-button" onclick={goHome}>← {text.back}</button>
          {#if canContinueRound}<button type="button" class="nes-btn cabinet-prompt" onclick={nextRound}><span class="physical-button green"></span>{text.nextRound} {level + 1}</button>{/if}
        </div>
      </section>
    {:else if $snapshot.matches('choosing')}
      <section inert={idleWarningSeconds !== null} class="team-screen">
        <h1 class="screen-title" bind:this={screenHeading} tabindex="-1">{text.selectTeam}</h1>
        <div class="team-roster" bind:this={teamRoster} role="group" aria-label={text.selectTeam}>
          {#each team as member}
            <button type="button" class="teammate-card" class:chosen={character.id === member.id} style={`--member-color:${member.color}`}
              aria-pressed={character.id === member.id} onclick={() => chooseCharacter(member.id)}>
              <span class="roster-portrait"><TeamAvatar character={member} decorative /></span>
              <span class="member-name">{member.name}</span>
              <span class="member-marker" aria-hidden="true">{character.id === member.id ? '▲' : ''}</span>
            </button>
          {/each}
        </div>
        <p class="character-quote" aria-live="polite">“{character.quote[language]}”</p>
        <footer class="selection-footer">
          <button class="nes-btn back-button" type="button" onclick={() => send({ type: 'HOME' })}>← {text.back}</button>
          <button class="nes-btn cabinet-prompt" type="button" onclick={start}><span class="physical-button green"></span>{text.start}</button>
        </footer>
      </section>
    {:else if $snapshot.matches('intro')}
      <section inert={idleWarningSeconds !== null} class="intro-screen">
        <h1 class="screen-title" bind:this={screenHeading} tabindex="-1">{text.introTitle}</h1>
        <div class="intro-character" class:ready={introReady}><TeamAvatar {character} shocked onready={() => introReady = true} /></div>
        <p class="intro-hint">{text.introHint.replace('{name}', character.name)}</p>
        <p class="round-rules">{text.level} {level} · {rules.multiplier}× {text.points} · {totalRemaining}s<br />{text.mistakeLimit.replace('{count}', String(rules.maxMistakes))}</p>
        <button class="nes-btn cabinet-prompt" type="button" onclick={finishIntro}><span class="physical-button green"></span>{text.go}</button>
      </section>
    {:else if question && ($snapshot.matches('loading') || playing)}
      <section inert={idleWarningSeconds !== null} class="play-screen">
        <GameHud {character} {score} results={$snapshot.context.results} {questionIndex} total={questions.length} totalSeconds={totalRemaining} question={questionRemaining}
          {level} levelLabel={text.level} totalLabel={text.total} questionLabel={text.round} progressLabel={text.progress} />
        <h1 class="question-prompt" bind:this={screenHeading} tabindex="-1">{question.prompt}</h1>
        {#key question.id}
          <QuestionScene {question} {language} {zoom} {imageUrl} {countdownRemaining} {countdownLabel} onready={imageReady} onerror={imageError} />
        {/key}
        <AnswerChoices choices={question.choices} activeChoice={$snapshot.context.activeChoice}
          disabled={!playing} label={text.answerLabel} onanswer={submitAnswer} />
        {#if !playing}<p class="loading-notice" role="status">{text.loading}</p>{/if}
      </section>
    {:else if $snapshot.matches('reveal') && question}
      <section inert={idleWarningSeconds !== null} class="reveal-screen">
        <GameHud {character} {score} results={$snapshot.context.results} {questionIndex} total={questions.length} totalSeconds={totalRemaining} question={questionRemaining}
          {level} levelLabel={text.level} totalLabel={text.total} questionLabel={text.round} progressLabel={text.progress} />
        <h1 class="verdict" class:correct class:wrong={!correct} bind:this={screenHeading} tabindex="-1">
          <span class="verdict-symbol" aria-hidden="true">{correct ? '✓' : '×'}</span>
          <span>{correct ? text.correct : text.wrong}</span><span class="verdict-points">+{$snapshot.context.lastPoints}</span>
        </h1>
        <p class="question-prompt reveal-prompt">{question.prompt}</p>
        <QuestionScene {question} {language} {zoom} {imageUrl} revealed />
        <div class="explanation" class:with-qr={Boolean(question.answerObjectId)}>
          <div class="explanation-copy">
            <h2>{question.photos ? `${question.answer} · ${question.object.title}` : question.answer}</h2>
            {#if question.photos}
              <dl class="date-answers" aria-label={text.collectionDating}>
                {#each question.photos as object, index}
                  <div class:correct-date={question.answer === 'ABCD'[index]}>
                    <dt>{'ABCD'[index]}{#if question.answer === 'ABCD'[index]}<span aria-label={text.correct}> ✓</span>{/if}</dt>
                    <dd>{object.date ? formatDate(object.date, language) : ''}</dd>
                  </div>
                {/each}
              </dl>
            {:else}<p class="description-page">{pages[descriptionPage]}</p>{/if}
            {#if !question.photos && pages.length > 1}
              <div class="page-controls">
                <button type="button" disabled={descriptionPage === 0} aria-label={text.previousPage} onclick={() => descriptionPage -= 1}>◀</button>
                <span>{descriptionPage + 1}/{pages.length}</span>
                <button type="button" disabled={descriptionPage === pages.length - 1} aria-label={text.nextPage} onclick={() => descriptionPage += 1}>▶</button>
              </div>
            {/if}
          </div>
          {#if question.answerObjectId}<ObjectQr objectId={question.answerObjectId} {language} />{/if}
        </div>
        <button type="button" class="nes-btn cabinet-prompt continue-button" onclick={continueGame}>
          <span class="physical-button green"></span>{questionIndex === questions.length - 1 ? text.results : text.next}
        </button>
        {#if !cabinetMode}
          <a class="metadata-report" href={metadataReportMailto(question, selected, data.objects)}>
            <span>{text.metadataMistake}</span><span class="metadata-report-action">{text.emailCurator}</span>
          </a>
        {/if}
      </section>
    {:else if $snapshot.matches('results')}
      <section inert={idleWarningSeconds !== null} class="ending-screen victory-screen">
        <div class="ending-backdrop"><DepotScene variant={sceneIndex} /><StoryArtwork scene="results" victory={victoryScene} /></div>
        <h1 class="screen-title ending-title" bind:this={screenHeading} tabindex="-1">{text.missionComplete}</h1>
        <div class="ending-panel">
          <p class="ending-quote">“{endingLine}”</p>
          <p class="final-score">{scoreText(score)}</p>
          {#if newHighScore}<p class="record-banner" role="status">{text.newHighScore}</p>{/if}
          <button type="button" class="nes-btn cabinet-prompt" onclick={showScoreboard}>
            <span class="physical-button green"></span>{text.scoreboard}
          </button>
          <button type="button" class="nes-btn scoreboard-link" onclick={nextRound}>{text.nextRound} {level + 1}</button>
        </div>
      </section>
    {:else if $snapshot.matches('gameOver')}
      <section inert={idleWarningSeconds !== null} class="ending-screen game-over-screen">
        <div class="ending-backdrop"><StoryArtwork scene="gameOver" boss={bossScene} /></div>
        <h1 class="screen-title ending-title" bind:this={screenHeading} tabindex="-1">{text.gameOver}</h1>
        <div class="ending-panel">
          <p class="ending-quote">“{endingLine}”</p>
          <p class="final-score">{scoreText(score)}</p>
          <button type="button" class="nes-btn cabinet-prompt" onclick={selectTeam}>
            <span class="physical-button green"></span>{text.retry}
          </button>
          <button type="button" class="nes-btn scoreboard-link" onclick={showScoreboard}>{text.scoreboard}</button>
        </div>
      </section>
    {/if}
    {#if idleWarningSeconds !== null}
      <div class="idle-warning-backdrop">
        <dialog open class="idle-warning" aria-modal="true" aria-labelledby="idle-warning-title" aria-describedby="idle-warning-time">
          <h2 id="idle-warning-title">{text.stillPlaying}</h2>
          <strong id="idle-warning-time" class="idle-countdown"><span class="sr-only">{text.idleReturn.replace('{seconds}', String(idleWarningSeconds))}</span><span aria-hidden="true">{idleWarningSeconds}</span></strong>
          <button type="button" class="nes-btn cabinet-prompt" bind:this={idleContinue} onclick={() => recordActivity()}><span class="physical-button green"></span>{text.keepPlaying}</button>
        </dialog>
      </div>
    {/if}
  </div>
</main>
