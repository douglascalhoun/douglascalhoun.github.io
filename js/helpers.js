var width  = canvas.width,
		height = canvas.height,
		tick  = 0
		config = {
			angle_devisor: 120
		};

function rand(num){
   return Math.floor(Math.random() * num)
}

function distance(obj, other){
	return Math.sqrt(Math.pow(Math.abs(obj.x - other.x), 2) + Math.pow(Math.abs(obj.y - other.y), 2))
}

var color = (function(){
	var freq = .3;

	return {
		next: function (){
			var r = Math.floor(Math.sin(freq * tick++) * 128 + 127);
			var b = Math.floor(Math.sin(freq * tick++ + 2) * 128 + 127);
			var g = Math.floor(Math.sin(freq * tick++ + 4) * 128 + 127);

			return "rgb(" + r + "," + b + "," + g + ")";
		}
	};
})();