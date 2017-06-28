/* global chrome */
var EventManager = require('ethereum-remix').lib.EventManager

function ChromeCloudSync (opts = {}) {
  var self = this
  self.event = new EventManager()

  if (typeof chrome === 'undefined' || !chrome || !chrome.storage || !chrome.storage.sync) {
    setTimeout(function () {
      self.event.trigger('ready', ['environment does not support `window.chrome`'])
    }, 0)
    return self
  } else {
    setTimeout(function () {
      self.event.trigger('ready', ['`window.chrome` supported'])
    }, 0)
  }

  self._api = {
    filesProviders: opts.api.filesProviders,
    refreshTabs: opts.api.refreshTabs,
    confirm: opts.api.confirm
  }

  var obj = {}
  var done = false
  var count = 0

  function check (key) {
    chrome.storage.sync.get(key, function (resp) {
      console.log('comparing to cloud', key, resp)
      if (typeof resp[key] !== 'undefined' && obj[key] !== resp[key] && self._api.confirm('Overwrite "' + key + '"? Click Ok to overwrite local file with file from cloud. Cancel will push your local file to the cloud.')) {
        console.log('Overwriting', key)
        self._api.filesProviders['browser'].set(key, resp[key])
        
        // self._api.refreshTabs()
        console.error('maybe `.refreshTabs()` ?')
      } else {
        console.log('add to obj', obj, key)
        self._api.filesProviders['browser'].get(key, (error, content) => {
          if (error) {
            console.log(error)
          } else {
            obj[key] = content
          }
        })
      }
      done++
      if (done >= count) {
        chrome.storage.sync.set(obj, function () {
          console.log('updated cloud files with: ', obj, this, arguments)
        })
      }
    })
  }

  for (var y in self._api.files.list()) {
    console.log('checking', y)
    self._api.filesProviders['browser'].get(y, (error, content) => {
      if (error) return console.log(error)
      obj[y] = content
      count++
      check(y)
    })
  }
}

module.exports = ChromeCloudSync
