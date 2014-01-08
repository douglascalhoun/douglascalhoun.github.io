var foreground = (function(){

	var canvas  = document.getElementById('canvas'),
			ctx     = canvas.getContext('2d'),
			stepNum = 0,
			lasers  = [];

	var allNodes = _(100).times(function(i){
		return new Node(ctx);
	});
	
	return {
		paint : function(){

			// blanks screen
			canvas.width = width;
			canvas.height = height;

			if ( tick % 10 === 0 && lasers.length < 5 ) {
				lasers.push( new Laser(ctx, _.sample(allNodes, 2) ));
			} 

			_(lasers).each(function(l){
				if( l.step >= 10 )
					l.retarget(allNodes);
			});

			_(lasers).each(function(l){ l.move() })

			_(allNodes).each(function(n){n.paint();});
		}
	};
})();