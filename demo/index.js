var audioPlayer = require('../')
var createApp = require('canvas-loop')
var createAnalyser = require('web-audio-analyser')
var createAudioContext = require('ios-safe-audio-context')
var average = require('analyser-frequency-average')
var once = require('once')

// simple mobile test
var userAgent = navigator.userAgent
var isMobile = /(iPhone|iPad|Android)/i.test(userAgent)

// get our canvas element & 2D context
var canvas = document.querySelector('canvas')
var ctx = canvas.getContext('2d')

// provide some info to the user
var loading = document.querySelector('.loading')
var clickToPlay = document.querySelector('.play')

// full-screen and retina scaled app
var app = createApp(canvas, {
  scale: window.devicePixelRatio
})

// mobile devices need a "Click to Play"
if (isMobile) {
  clickToPlay.style.display = 'block'
  loading.style.display = 'none'
  window.addEventListener('touchend', once(function (ev) {
    ev.preventDefault()
    loading.style.display = 'block'
    clickToPlay.style.display = 'none'
    start()
  }))
} else {
  start()
}

function start () {
  // Create an iOS-safe AudioContext which fixes
  // potential sampleRate bugs with playback
  // (The hack needs to be called on touchend for iOS!)
  var audioContext = createAudioContext()

  // Safari 8.x also needs buffering, although this is already
  // fixed in Safari Nightly.
  var isSafari = !/Chrome/i.test(userAgent) && /Safari/i.test(userAgent)

  // Chrome on iOS 9.2 works fine
  var isIOSChrome = /CriOS/i.test(userAgent)

  // Ideally we would feature-detect this instead of rely on userAgent.
  var shouldBuffer = (isMobile || isSafari) && !isIOSChrome

  // Create a looping audio player with our audio context.
  // On mobile, we use the "buffer" mode to support AudioAnalyser.
  var player = audioPlayer('demo/bluejean_short.mp3', {
    context: audioContext,
    buffer: shouldBuffer,
    loop: true
  })

  // Set up our AnalyserNode utility
  // Make sure to use the same AudioContext as our player!
  var audioUtil = createAnalyser(player.node, player.context, {
    stereo: false
  })

  // The actual AnalyserNode
  var analyser = audioUtil.analyser

  // This is triggered on mobile, when decodeAudioData begins.
  player.once('decoding', function (amount) {
    loading.innerText = 'Decoding...'
  })

  // This is called with 'canplay' on desktop, and after
  // decodeAudioData on mobile.
  player.on('load', function () {
    loading.style.display = 'none'

    console.log('Source:', player.element ? 'MediaElement' : 'Buffer')
    console.log('Playing', Math.round(player.duration) + 's of audio...')

    // start audio node
    player.play()

    // start the render loop
    app.on('tick', render)
    app.start()
  })

  function render () {
    var width = app.shape[0]
    var height = app.shape[1]

    // retina scaling
    ctx.save()
    ctx.scale(app.scale, app.scale)
    ctx.clearRect(0, 0, width, height)

    // grab our byte frequency data for this frame
    var freqs = audioUtil.frequencies()

    // find an average signal between two Hz ranges
    var minHz = 40
    var maxHz = 100
    var avg = average(analyser, freqs, minHz, maxHz)

    // draw a circle
    ctx.beginPath()
    var radius = Math.min(width, height) / 4 * avg
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}