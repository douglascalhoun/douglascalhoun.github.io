var foreground = (function(){

	var canvas  = document.getElementById('canvas'),
			ctx     = canvas.getContext('2d'),
			stepNum = 0;
	
	return {
		init: function(){
			this.lasers = Laser.placeLasers();
			this.nodes = Node.placeNodes();
		},
		ctx: ctx,
		clear: function(){
			// blanks screen
			canvas.width = width;
			canvas.height = height;
		},
		paint : function(){
			foreground.clear();

			

			_(foreground.lasers).each(function(l){ 
				l.end ? l.move() : l.retarget();
			})

			_(foreground.nodes).each(function(n){
				n.paint();
			});
		}
	};
})();

foreground.init();