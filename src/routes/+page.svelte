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
  import { team } from '$lib/game/team'
  import { cabinetKeys, joystickDirection, descriptionPages } from '$lib/game/cabinet'
  import { copy } from '$lib/game/i18n'
  import { gameMachine } from '$lib/game/machine'
  import { createQuestionBank, createSession, questionObjects, replacementQuestion } from '$lib/game/questions'
  import type { CharacterId, GameData, GameObject, Language, Question } from '$lib/game/types'
  import { registerArcadeTools } from '$lib/game/webmcp'

  const SESSION_LENGTH = 10
  const QUESTION_SECONDS = 20
  const GAME_SECONDS = 240
  let questionBank: Question[] = []
  let failedObjects = new Set<string>()
  let imageRetries = 0
  let loadingStarted = 0
  const cabinetMode = ['1', 'true', 'yes'].includes(String(env.PUBLIC_CABINET ?? '').toLowerCase())
  const configuredImageBase = String(env.PUBLIC_OBJECT_IMAGE_BASE ?? '').trim().replace(/\/$/, '')
  const { snapshot, send, actorRef } = useMachine(gameMachine)
  const questions = $derived($snapshot.context.questions)
  const questionIndex = $derived($snapshot.context.questionIndex)
  const question = $derived(questions[questionIndex] ?? null)
  const score = $derived($snapshot.context.score)
  const selected = $derived($snapshot.context.selected)
  const correct = $derived(Boolean(selected && selected === question?.answer))
  const playing = $derived($snapshot.matches('playing'))
  const character = $derived(team.find(member => member.id === $snapshot.context.characterId) ?? team[1])
  let language = $state<Language>('nl')
  const text = $derived(copy[language])
  const pages = $derived(descriptionPages(question?.explanation ?? '', 140))
  let best = $state(0)
  let storageReady = $state(false)
  let screenHeading = $state<HTMLElement>()
  let photoTimer: ReturnType<typeof setTimeout> | undefined
  let timerInterval: ReturnType<typeof setInterval> | undefined
  let noticeTimer: ReturnType<typeof setTimeout> | undefined
  let introTimer: ReturnType<typeof setTimeout> | undefined
  let spillKey = $state(0)
  const sceneIndex = $derived($snapshot.matches('choosing') ? 1 : questionIndex % 3)
  let totalDeadline = 0
  let questionDeadline = 0
  let totalRemaining = $state(GAME_SECONDS)
  let questionRemaining = $state(QUESTION_SECONDS)
  let sound = $state(true)
  let zoom = $state(1)
  let descriptionPage = $state(0)
  let soundNotice = $state('')
  let lastJoystickMove = 0
  let audioContext: AudioContext | undefined
  const scoreText = (number: number) => String(number).padStart(4, '0')

  function imageUrl(object: GameObject) {
    if (!configuredImageBase) return object.imageRemote
    if (/^https?:\/\//.test(configuredImageBase)) return `${configuredImageBase}/${object.id}.jpg`
    const directory = configuredImageBase.replace(/^\.\//, '').replace(/^\//, '')
    return `${base}/${directory}/${object.id}.jpg`.replace(/\/+/g, '/')
  }

  function storageKey() { return `daphnes-arcade:best:v3:${language}` }
  function loadBest() {
    try {
      const stored = Number(localStorage.getItem(storageKey()))
      best = Number.isInteger(stored) && stored >= 0 && stored <= SESSION_LENGTH * 100 ? stored : 0
    } catch { best = 0 }
  }
  function chooseLanguage(next: Language) {
    if (!$snapshot.matches('title')) return
    language = next
    try { localStorage.setItem('daphnes-arcade:language:v1', next) } catch { /* Preference is optional. */ }
    if (storageReady) loadBest()
  }
  function selectTeam() {
    if (!['title', 'results', 'gameOver'].includes(String(actorRef.getSnapshot().value))) return
    totalDeadline = 0
    questionDeadline = 0
    send({ type: 'SELECT_TEAM' })
  }
  function chooseCharacter(characterId: CharacterId) { send({ type: 'CHOOSE_CHARACTER', characterId }) }
  function moveCharacter(delta: number) {
    const index = team.findIndex(member => member.id === character.id)
    chooseCharacter(team[(index + delta + team.length) % team.length].id)
  }
  function finishIntro() {
    clearTimeout(introTimer)
    if (actorRef.getSnapshot().matches('intro')) send({ type: 'INTRO_DONE' })
  }

  onMount(() => {
    try {
      const storedLanguage = localStorage.getItem('daphnes-arcade:language:v1')
      if (storedLanguage === 'nl' || storedLanguage === 'en') language = storedLanguage
    } catch { /* Play still works without browser storage. */ }
    storageReady = true
    loadBest()
    timerInterval = setInterval(updateTimers, 100)
    const disposeTools = registerArcadeTools({
      read: () => {
        const state = actorRef.getSnapshot()
        const current = state.context.questions[state.context.questionIndex]
        const revealed = state.matches('reveal') || state.matches('results')
        return { state: state.value, score: state.context.score, character: state.context.characterId,
          question: current ? { prompt: current.prompt, clue: current.clue,
            images: questionObjects(current).map(o => imageUrl(o)),
            image: imageUrl(current.object), imageAlt: current.object.imageAlt[current.language] ?? '',
            choices: current.choices,
            ...(revealed ? { answer: current.answer, title: current.object.title } : {}) } : null }
      },
      selectTeam, chooseCharacter, start, finishIntro, answer: submitAnswer, finish: continueGame, settle: tick
    })
    return () => {
      disposeTools()
      clearInterval(timerInterval)
      clearTimeout(photoTimer)
      clearTimeout(noticeTimer)
      clearTimeout(introTimer)
      void audioContext?.close()
    }
  })

  $effect(() => {
    if (($snapshot.matches('results') || $snapshot.matches('gameOver')) && storageReady && score > best) {
      best = score
      try { localStorage.setItem(storageKey(), String(best)) } catch { /* Optional local record. */ }
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
      loadingStarted = performance.now()
      photoTimer = setTimeout(() => imageError(current.id), 12_000)
      return () => clearTimeout(photoTimer)
    }
  })
  $effect(() => {
    if ($snapshot.matches('intro')) {
      introTimer = setTimeout(finishIntro, 3300)
      return () => clearTimeout(introTimer)
    }
  })

  $effect(() => {
    if (!playing) return
    const next = questions[questionIndex + 1]
    if (next) questionObjects(next).forEach(object => { const image = new Image(); image.src = imageUrl(object) })
  })

  function updateTimers() {
    const state = actorRef.getSnapshot()
    if (!state.matches('loading') && !state.matches('playing') && !state.matches('reveal')) return
    const now = performance.now()
    if (totalDeadline && !state.matches('loading')) {
      totalRemaining = Math.max(0, Math.ceil((totalDeadline - now) / 1000))
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
  function enterFullscreen() {
    if (cabinetMode && !document.fullscreenElement && document.fullscreenEnabled) {
      void document.documentElement.requestFullscreen().catch(() => {})
    }
  }
  function start() {
    if (!actorRef.getSnapshot().matches('choosing')) return
    enterFullscreen()
    spillKey += 1
    zoom = 1
    descriptionPage = 0
    totalRemaining = GAME_SECONDS
    questionRemaining = QUESTION_SECONDS
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]
    questionBank = createQuestionBank(data as GameData, language)
    failedObjects = new Set()
    imageRetries = 0
    const mission = createSession(questionBank, seed, SESSION_LENGTH)
    questionRemaining = mission[0].seconds
    send({ type: 'START', questions: mission })
    totalDeadline = 0
    questionDeadline = 0
    beep()
  }
  function imageReady(id: string) {
    const state = actorRef.getSnapshot()
    if (!state.matches('loading') || state.context.questions[state.context.questionIndex]?.id !== id) return
    if (totalDeadline && loadingStarted) totalDeadline += performance.now() - loadingStarted
    loadingStarted = 0
    clearTimeout(photoTimer)
    send({ type: 'IMAGE_READY' })
    if (actorRef.getSnapshot().matches('playing')) {
      if (!totalDeadline) totalDeadline = performance.now() + GAME_SECONDS * 1000
      questionRemaining = question?.seconds ?? QUESTION_SECONDS
      questionDeadline = performance.now() + questionRemaining * 1000
    }
  }
  function imageError(id: string) {
    const state = actorRef.getSnapshot()
    const current = state.context.questions[state.context.questionIndex]
    if (!state.matches('loading') || current?.id !== id) return
    clearTimeout(photoTimer)
    if (totalDeadline && loadingStarted) totalDeadline += performance.now() - loadingStarted
    loadingStarted = 0
    questionObjects(current).forEach(o => failedObjects.add(o.id))
    const replacement = imageRetries++ < 12 ? replacementQuestion(questionBank, state.context.questions, failedObjects, current.kind) : undefined
    if (replacement) {
      questionRemaining = replacement.seconds
      send({ type: 'REPLACE_QUESTION', question: replacement })
      return
    }
    totalDeadline = 0
    questionDeadline = 0
    send({ type: 'IMAGE_ERROR' })
  }
  function submitAnswer(value: string) {
    if (!playing || !question) return
    questionDeadline = 0
    beep(value === question.answer)
    send({ type: 'ANSWER', answer: value })
  }
  function confirmAnswer() {
    if (!playing || !question) return
    const value = question.choices[$snapshot.context.activeChoice]
    questionDeadline = 0
    zoom = 1
    beep(value === question.answer)
    send({ type: 'CONFIRM' })
  }
  function continueGame() {
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
      } else if ($snapshot.matches('choosing')) {
        moveCharacter(direction === 'left' || direction === 'up' ? -1 : 1)
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
      sound = !sound
      soundNotice = sound ? text.soundOn : text.soundOff
      clearTimeout(noticeTimer)
      noticeTimer = setTimeout(() => { soundNotice = '' }, 1200)
      if (sound) beep()
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
      if ($snapshot.matches('title') || $snapshot.matches('results') || $snapshot.matches('gameOver')) selectTeam()
      else if ($snapshot.matches('choosing')) start()
      else if ($snapshot.matches('intro')) finishIntro()
      else if (playing) confirmAnswer()
      else if ($snapshot.matches('reveal')) continueGame()
    }
  }
</script>

<svelte:head>
  <title>Daphne's Arcade</title>
  <meta name="description" content="Daphne’s Arcade: The Lost Labels. Kies je teamgenoot en help Daphne de labels weer aan de erfgoedcollectie van TU Delft te koppelen." />
</svelte:head>
<svelte:window onkeydown={handleKeydown} />

<main class="cabinet" class:cabinet-mode={cabinetMode}>
  <div class="screen" data-scene={sceneIndex} class:menu-scene={$snapshot.matches('title') || $snapshot.matches('choosing')}>
    <DepotScene variant={sceneIndex} />
    {#if questions.length && !$snapshot.matches('title') && !$snapshot.matches('choosing')}
      {#key spillKey}<LabelSpill />{/key}
    {/if}
    {#if soundNotice}<div class="sound-notice" role="status">{soundNotice}</div>{/if}
    {#if $snapshot.matches('title')}
      <section class="attract-screen">
        <p class="high-score">{text.highScore} {scoreText(best)}</p>
        <div class="title-copy">
          <h1 class="arcade-title" bind:this={screenHeading} tabindex="-1">DAPHNE'S<span>ARCADE</span></h1>
          <p class="mission-tag">{text.mission}</p>
        </div>
        <div class="team-lineup" aria-hidden="true">
          {#each team as member}<div style={`--member-color:${member.color}`}><TeamAvatar character={member} decorative /></div>{/each}
        </div>
        <button type="button" class="nes-btn cabinet-prompt start-prompt" onclick={selectTeam}>
          <span class="physical-button green"></span>{text.start}
        </button>
        <div class="language-switch" aria-label={text.language}>
          <button type="button" class="nes-btn" class:is-primary={language === 'nl'} aria-pressed={language === 'nl'} onclick={() => chooseLanguage('nl')}>NL</button>
          <button type="button" class="nes-btn" class:is-primary={language === 'en'} aria-pressed={language === 'en'} onclick={() => chooseLanguage('en')}>EN</button>
        </div>
      </section>
    {:else if $snapshot.matches('choosing')}
      <section class="team-screen">
        <h1 class="screen-title" bind:this={screenHeading} tabindex="-1">{text.selectTeam}</h1>
        <div class="team-roster" role="group" aria-label={text.selectTeam}>
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
      <section class="intro-screen">
        <h1 class="screen-title" bind:this={screenHeading} tabindex="-1">{text.introTitle}</h1>
        <div class="intro-character"><TeamAvatar character={team[1]} decorative /></div>
        <p class="intro-hint">{text.introHint}</p>
        <button class="nes-btn cabinet-prompt" type="button" onclick={finishIntro}><span class="physical-button green"></span>{text.go}</button>
      </section>
    {:else if question && ($snapshot.matches('loading') || playing)}
      <section class="play-screen">
        <GameHud {character} {score} results={$snapshot.context.results} {questionIndex} total={questions.length} totalSeconds={totalRemaining} question={questionRemaining}
          totalLabel={text.total} questionLabel={text.round} progressLabel={text.progress} />
        <h1 class="question-prompt" bind:this={screenHeading} tabindex="-1">{question.prompt}</h1>
        {#key question.id}
          <QuestionScene {question} {language} {zoom} {imageUrl} onready={imageReady} onerror={imageError} />
        {/key}
        <AnswerChoices choices={question.choices} activeChoice={$snapshot.context.activeChoice}
          disabled={!playing} label={text.answerLabel} onanswer={submitAnswer} />
        {#if !playing}<p class="loading-notice" role="status">{text.loading}</p>{/if}
      </section>
    {:else if $snapshot.matches('reveal') && question}
      <section class="reveal-screen">
        <GameHud {character} {score} results={$snapshot.context.results} {questionIndex} total={questions.length} totalSeconds={totalRemaining} question={questionRemaining}
          totalLabel={text.total} questionLabel={text.round} progressLabel={text.progress} />
        <h1 class="verdict" class:wrong={!correct} bind:this={screenHeading} tabindex="-1">{correct ? '+100' : text.wrong}</h1>
        <p class="question-prompt reveal-prompt">{question.prompt}</p>
        <QuestionScene {question} {language} {zoom} {imageUrl} revealed />
        <div class="explanation">
          <h2>{question.answer}</h2>
          <p class="description-page">{pages[descriptionPage]}</p>
          {#if pages.length > 1}
            <div class="page-controls">
              <button type="button" disabled={descriptionPage === 0} aria-label={text.previousPage} onclick={() => descriptionPage -= 1}>◀</button>
              <span>{descriptionPage + 1}/{pages.length}</span>
              <button type="button" disabled={descriptionPage === pages.length - 1} aria-label={text.nextPage} onclick={() => descriptionPage += 1}>▶</button>
            </div>
          {/if}
        </div>
        <button type="button" class="nes-btn cabinet-prompt continue-button" onclick={continueGame}>
          <span class="physical-button green"></span>{questionIndex === questions.length - 1 ? text.results : text.next}
        </button>
      </section>
    {:else if $snapshot.matches('results')}
      <section class="results-screen">
        <div class="result-player"><TeamAvatar {character} decorative /></div>
        <h1 class="screen-title" bind:this={screenHeading} tabindex="-1">{text.missionComplete}</h1>
        <p class="final-score">{scoreText(score)}</p>
        <p class="result-summary">{$snapshot.context.results.filter(result => result === 'correct').length}/{questions.length} {text.recovered}</p>
        <button type="button" class="nes-btn cabinet-prompt" onclick={selectTeam}>
          <span class="physical-button green"></span>{text.playAgain}
        </button>
      </section>
    {:else if $snapshot.matches('gameOver')}
      <section class="results-screen">
        <div class="result-player"><TeamAvatar {character} decorative /></div>
        <h1 class="screen-title" bind:this={screenHeading} tabindex="-1">{text.gameOver}</h1>
        <p class="game-over-reason">{$snapshot.context.gameOverReason === 'question-time' ? text.questionTime : $snapshot.context.gameOverReason === 'game-time' ? text.gameTime : text.imageError}</p>
        <p class="final-score">{scoreText(score)}</p>
        <button type="button" class="nes-btn cabinet-prompt" onclick={selectTeam}>
          <span class="physical-button green"></span>{text.retry}
        </button>
      </section>
    {/if}
  </div>
</main>
