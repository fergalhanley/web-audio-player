var EventEmitter = require('events').EventEmitter
var createAudio = require('simple-media-element').audio
var createAudioContext = require('./audio-context')
var assign = require('object-assign')
var once = require('once')

module.exports = createMediaSource
function createMediaSource (src, opt) {
  opt = assign({}, opt)
  var emitter = new EventEmitter()

  // default to Audio instead of HTMLAudioElement
  // https://github.com/hughsk/web-audio-analyser/pull/5
  if (!opt.element) opt.element = new window.Audio()

  var audio = createAudio(src, opt)
  var audioContext = opt.context || createAudioContext()
  var node = audioContext.createMediaElementSource(audio)

  audio.addEventListener('ended', function () {
    emitter.emit('end')
  })

  emitter.element = audio
  emitter.context = audioContext
  emitter.node = node
  emitter.play = audio.play.bind(audio)
  emitter.pause = audio.pause.bind(audio)

  Object.defineProperties(emitter, {
    duration: {
      enumerable: true, configurable: true,
      get: function () {
        return audio.duration
      }
    },
    currentTime: {
      enumerable: true, configurable: true,
      get: function () {
        return audio.currentTime
      }
    }
  })

  process.nextTick(startLoad)
  return emitter

  function startLoad () {
    var done = once(function () {
      emitter.emit('load')
    })

    // On most browsers the loading begins
    // immediately. However, on iOS 9.2 Safari,
    // you need to call load() for events
    // to be triggered.
    audio.load()

    if (audio.readyState >= audio.HAVE_ENOUGH_DATA) {
      done()
    } else {
      audio.addEventListener('canplay', done)
      audio.addEventListener('error', once(function (err) {
        emitter.emit('error', err)
      }))
    }
  }
}