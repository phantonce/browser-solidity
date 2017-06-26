var $ = require('jquery')

module.exports = tabbedMenu

function tabbedMenu (container, appAPI, events, opts) {
  $('#options li').click(function (ev) {
    var $el = $(this)
    selectTab($el)
  })

  events.app.register('debuggingRequested', () => {
    selectTab($('ul#options li.debugView'))
  })

  // initialize tabbed menu
  selectTab($('#options .compileView'))

  // select tab
  function selectTab (el) {
    var match = /[a-z]+View/.exec(el.get(0).className)
    if (!match) return
    var cls = match[0]
    if (!el.hasClass('active')) {
      el.parent().find('li').removeClass('active')
      $('#optionViews').attr('class', '').addClass(cls)
      el.addClass('active')
    }
    events.app.trigger('tabChanged', [cls])
  }
}
