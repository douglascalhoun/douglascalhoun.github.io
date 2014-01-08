var background = (function(){
	var	bgCanvas = document.getElementById('bgCanvas'),
				bgCtx  = bgCanvas.getContext('2d');

	var paintBackground = function(){
		bgCanvas.width = width;
		bgCanvas.height = height;
		_.each(visibleSquares, function(sq, i){
			var x = sq.x * 10;
			var y = sq.y * 10;
			bgCtx.fillStyle = generateGrass();
			bgCtx.fillRect(x, y, 10, 10);
		});
	}

	function generateGrass(){
		var r = 205,
				b = 225,
        g = 225;

		// return "rgb(" + r + "," + g + "," + b + ")";
		return "rgb(" + r + "," + g + "," + b + ")";
	}

	function Square(index) {
		this.x = Math.floor(index / 75);
		this.y = index % 75;
		this.background = generateGrass();
	}

	var visibleSquares = _(height * 10).times(function(index){
			return new Square(index);
		})

	return {
		paint: paintBackground,
		visible: visibleSquares
	};

})();