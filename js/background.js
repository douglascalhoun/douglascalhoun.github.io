var background = (function(){
	var	bgCanvas = document.getElementById('bgCanvas'),
				bgCtx  = bgCanvas.getContext('2d');
	
	var paintBackground = function(){
		bgCanvas.width = width;
		bgCanvas.height = height;

		_.each(visibleSquares, function(sq, i){
			var x = sq.x * 10;
			var y = sq.y * 10;
			bgCtx.fillStyle =  sq.background;
			bgCtx.fillRect(x, y, 10, 10);
		});
	}

	function generateBG(ter){
		var terrain_types = {
			grass: [0, 25, 0],
			tree: [110,45,45]
		};

		terrain = terrain_types[ter || 'grass'];
		return "rgb(" + terrain[0] + "," + terrain[1] + "," + terrain[2] + ")";
	}

	function Square(index) {
		this.x = Math.floor(index / 75);
		this.y = index % 75;
		// this.background = color.makeColor(index)
		this.background = generateBG();
	}

	var visibleSquares = _(height * 10).times(function(index){
			return new Square(index);
		})

	return {
		paint: paintBackground,
		visible: visibleSquares
	};

})();