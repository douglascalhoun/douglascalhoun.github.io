var game = (function(){

	return {
		init: function(){
			game.reset();
			background.paint();
			requestAnimationFrame(game.step);
		},
		step: function(){
			tick++;
			foreground.paint();	
			requestAnimationFrame(game.step);
		},
		reset: function(){
			console.log('reset')
			foreground.init();
		},
		end: function(){
			foreground.clear();
			foreground.ctx.font="20px Georgia";
			foreground.ctx.fillText("Finito!",10,50);
		}
	}
})();
 

game.init();