var game = (function(){

	return {
		init: function(){
			background.paint();
			requestAnimationFrame(game.step);
		},
		step: function(){
			tick++;
			foreground.paint();	
			// setTimeout(function(){
			requestAnimationFrame(game.step);
			// },50)
			},
			end: function(){
				foreground.clear();
				foreground.ctx.font="20px Georgia";
				foreground.ctx.fillText("Finito!",10,50);
			}
		}
})();
 

game.init();