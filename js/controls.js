// Generated by CoffeeScript 1.6.3
var __slice = [].slice;

$(function() {
  $("input[name=rotation]").val(rotation).on('change', function() {
    window.rotation = $(this).val();
    return game.reset();
  });
  $("input[name=nodes]").val(numberOfNodes).on('change', function() {
    window.numberOfNodes = $(this).val();
    return game.reset();
  });
  return $("input[name=lasers]").val(numberOfLasers).on('change', function() {
    window.numberOfLasers = $(this).val();
    return game.reset();
  });
});

window.log = function() {
  var messages;
  messages = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
  return $("#log").append($("<div>").html(messages.map(function(m) {
    return $("<span>").text(m);
  })));
};

/*
//@ sourceMappingURL=controls.map
*/