$ ->
	$("input[name=rotation]").val(rotation).on 'change', ->
		window.rotation = $(@).val()
		game.reset()
	
	$("input[name=nodes]").val(numberOfNodes).on 'change', ->
		window.numberOfNodes = $(@).val();
		game.reset()
	

	$("input[name=lasers]").val(numberOfLasers).on 'change', ->
		window.numberOfLasers = $(@).val()
		game.reset()

window.log = (messages...)->
	$("#log").append $("<div>").html messages.map (m) -> $("<span>").text m