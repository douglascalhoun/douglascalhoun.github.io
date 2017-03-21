var mvc = {
  observable: function () {
    var callbacks = {}

    return {
      on: function (event, fn) {
        (callbacks[event] = callbacks[event] || []).push(fn)
      }
    }
  },
  render: function(){

  }
}

mvc.observable
