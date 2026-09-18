<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { base } from '$app/paths'
  import { env } from '$env/dynamic/public'
  import { useMachine } from '@xstate/svelte'
  import data from '$lib/data/game-data.json'
  import ObjectPhoto from '$lib/components/ObjectPhoto.svelte'
  import AnswerChoices from '$lib/components/AnswerChoices.svelte'
  import GameHud from '$lib/components/GameHud.svelte'
  import { cabinetKeys, joystickDirection, descriptionPages } from '$lib/game/cabinet'
  import { copy } from '$lib/game/i18n'
  import { gameMachine } from '$lib/game/machine'
  import { createIdentificationSession } from '$lib/game/questions/identify-object'
  import type { GameObject, Language } from '$lib/game/types'
  import { registerArcadeTools } from '$lib/game/webmcp'

  const SESSION_LENGTH = 8
  const QUESTION_SECONDS = 20
  const GAME_SECONDS = 240
  const objects: GameObject[] = data.objects
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
  let language = $state<Language>('nl')
  const text = $derived(copy[language])
  const pages = $derived(descriptionPages(question?.object.description[language] ?? ''))
  let best = $state(0)
  let storageReady = $state(false)
  let screenHeading = $state<HTMLElement>()
  let photoTimer: ReturnType<typeof setTimeout> | undefined
  let timerInterval: ReturnType<typeof setInterval> | undefined
  let noticeTimer: ReturnType<typeof setTimeout> | undefined
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

  function storageKey() { return `daphnes-arcade:best:v2:${language}` }
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
        return { state: state.value, score: state.context.score,
          question: current ? { prompt: copy[current.language].question,
            image: imageUrl(current.object), imageAlt: current.object.imageAlt[current.language] ?? '',
            choices: current.choices,
            ...(revealed ? { answer: current.answer, title: current.object.title } : {}) } : null }
      },
      start, answer: submitAnswer, finish: continueGame, settle: tick
    })
    return () => {
      disposeTools()
      clearInterval(timerInterval)
      clearTimeout(photoTimer)
      clearTimeout(noticeTimer)
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
      photoTimer = setTimeout(imageError, 12_000)
      return () => clearTimeout(photoTimer)
    }
  })

  function updateTimers() {
    const state = actorRef.getSnapshot()
    if (!state.matches('loading') && !state.matches('playing') && !state.matches('reveal')) return
    const now = performance.now()
    if (totalDeadline) {
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
    enterFullscreen()
    zoom = 1
    descriptionPage = 0
    totalRemaining = GAME_SECONDS
    questionRemaining = QUESTION_SECONDS
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]
    send({ type: 'START', questions: createIdentificationSession(objects, seed, language, SESSION_LENGTH) })
    totalDeadline = performance.now() + GAME_SECONDS * 1000
    questionDeadline = 0
    beep()
  }
  function imageReady() {
    clearTimeout(photoTimer)
    send({ type: 'IMAGE_READY' })
    if (actorRef.getSnapshot().matches('playing')) {
      questionRemaining = QUESTION_SECONDS
      questionDeadline = performance.now() + QUESTION_SECONDS * 1000
    }
  }
  function imageError() {
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
      } else if (playing) send({ type: 'MOVE', direction })
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
      if ($snapshot.matches('title') || $snapshot.matches('results') || $snapshot.matches('gameOver')) start()
      else if (playing) confirmAnswer()
      else if ($snapshot.matches('reveal')) continueGame()
    }
  }
</script>

<svelte:head>
  <title>Daphne's Arcade</title>
  <meta name="description" content="Een arcade voor Daphne. Herken objecten uit de erfgoedcollectie van TU Delft." />
</svelte:head>
<svelte:window onkeydown={handleKeydown} />

<main class="cabinet" class:cabinet-mode={cabinetMode}>
  <div class="screen">
    {#if soundNotice}<div class="sound-notice" role="status">{soundNotice}</div>{/if}
    {#if $snapshot.matches('title')}
      <section class="attract-screen">
        <p class="high-score">{text.highScore} {scoreText(best)}</p>
        <h1 class="arcade-title" bind:this={screenHeading} tabindex="-1">DAPHNE'S<span>ARCADE</span></h1>
        <div class="attract-objects" aria-hidden="true">
          {#each objects.slice(0, 3) as object}<div class="mini-bezel"><img src={imageUrl(object)} alt="" /></div>{/each}
        </div>
        <div class="language-switch" aria-label={text.language}>
          <button type="button" class="nes-btn" class:is-primary={language === 'nl'} onclick={() => chooseLanguage('nl')}>NL</button>
          <button type="button" class="nes-btn" class:is-primary={language === 'en'} onclick={() => chooseLanguage('en')}>EN</button>
        </div>
        <button type="button" class="nes-btn is-success cabinet-prompt start-prompt" onclick={start}>
          <span class="physical-button green"></span>{text.start}
        </button>
        <p class="dedication">{text.dedication} <i class="nes-icon heart is-small" aria-hidden="true"></i></p>
      </section>
    {:else if question && ($snapshot.matches('loading') || playing)}
      <section class="play-screen">
        <GameHud results={$snapshot.context.results} {questionIndex} total={questions.length} totalSeconds={totalRemaining} question={questionRemaining}
          totalLabel={text.total} questionLabel={text.round} progressLabel={text.progress} />
        <h1 class="screen-title" bind:this={screenHeading} tabindex="-1">{text.question}</h1>
        {#key question.object.id}
          <ObjectPhoto object={question.object} {language} src={imageUrl(question.object)} {zoom}
            onready={imageReady} onerror={imageError} />
        {/key}
        <AnswerChoices choices={question.choices} activeChoice={$snapshot.context.activeChoice}
          disabled={!playing} label={text.answerLabel} onanswer={submitAnswer} />
        <div class="control-prompt" aria-live="polite">
          {#if playing}<span><span class="direction-characters" aria-hidden="true"><span class="direction-left"></span><span></span><span class="direction-up"></span><span class="direction-down"></span></span> {text.choose}</span><span><span class="physical-button green"></span> {text.confirm}</span>
          {:else}<span>{text.loading}</span>{/if}
        </div>
      </section>
    {:else if $snapshot.matches('reveal') && question}
      <section class="reveal-screen">
        <GameHud results={$snapshot.context.results} {questionIndex} total={questions.length} totalSeconds={totalRemaining} question={questionRemaining}
          totalLabel={text.total} questionLabel={text.round} progressLabel={text.progress} />
        <div class="result-banner" class:correct class:wrong={!correct}>
          <i class={`nes-icon ${correct ? 'trophy' : 'close'} is-medium`} aria-hidden="true"></i>
          <h1 class="screen-title" bind:this={screenHeading} tabindex="-1">{correct ? text.correct : text.wrong} {correct ? '+100' : ''}</h1>
        </div>
        <div class="reveal-content">
          <ObjectPhoto object={question.object} {language} src={imageUrl(question.object)} {zoom} />
          <div class="nes-container is-dark explanation">
            {#if !correct}<p class="answer-feedback">{text.yourChoice}: <strong>{selected}</strong></p>{/if}
            <p class="answer-label">{text.correctAnswer}</p>
            <h2>{question.answer}</h2>
            <p class="description-page">{pages[descriptionPage]}</p>
            {#if pages.length > 1}<p class="page-indicator"><span aria-hidden="true">&lt;</span> {descriptionPage + 1} / {pages.length} <span aria-hidden="true">&gt;</span></p>{/if}
          </div>
        </div>
        <button type="button" class="nes-btn is-success cabinet-prompt" onclick={continueGame}>
          <span class="physical-button green"></span>{questionIndex === questions.length - 1 ? text.results : text.next}
        </button>
      </section>
    {:else if $snapshot.matches('results')}
      <section class="results-screen">
        <GameHud results={$snapshot.context.results} {questionIndex} total={questions.length} totalSeconds={totalRemaining} question={questionRemaining}
          totalLabel={text.total} questionLabel={text.round} progressLabel={text.progress} />
        <h1 class="screen-title" bind:this={screenHeading} tabindex="-1">{text.yourScore}</h1>
        <p class="final-score">{scoreText(score)}</p>
        <p class="result-summary">{text.correctCount}: {$snapshot.context.results.filter(result => result === 'correct').length} / {questions.length}</p>
        <p class="high-score">{text.highScore} {scoreText(best)}</p>
        <button type="button" class="nes-btn is-success cabinet-prompt start-prompt" onclick={start}>
          <span class="physical-button green"></span>{text.playAgain}
        </button>
        <p class="dedication">{text.thanks} <i class="nes-icon heart is-small" aria-hidden="true"></i></p>
      </section>
    {:else if $snapshot.matches('gameOver')}
      <section class="game-over-screen">
        <GameHud results={$snapshot.context.results} {questionIndex} total={questions.length} totalSeconds={totalRemaining} question={questionRemaining}
          totalLabel={text.total} questionLabel={text.round} progressLabel={text.progress} />
        <i class="nes-icon close is-large" aria-hidden="true"></i>
        <h1 class="game-over-title" bind:this={screenHeading} tabindex="-1">{text.gameOver}</h1>
        <p class="game-over-reason">{$snapshot.context.gameOverReason === 'question-time' ? text.questionTime : $snapshot.context.gameOverReason === 'game-time' ? text.gameTime : text.imageError}</p>
        <p class="final-score small">{scoreText(score)}</p>
        <button type="button" class="nes-btn is-success cabinet-prompt" onclick={start}>
          <span class="physical-button green"></span>{text.retry}
        </button>
      </section>
    {/if}
  </div>
</main>
