var width  = canvas.width,
		height = canvas.height,
		tick  = 0,
		cx = width/2,
		cy = height/2,
		config = {
			angle_devisor: 90
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
		next: function (x, y, id){
			var r = Math.floor(Math.sin(freq * tick++) * 230 + 25);
			var b = Math.floor(Math.sin(freq * tick + 2) * 230 + 25);
			var g = Math.floor(Math.sin(freq * tick + 4) * 230 + 25);

			return "rgb(" + r + "," + b + "," + g + ")";
		},
		makeColor: function (i, freq1, freq2, freq3, phase1, phase2, phase3, center, width){
    if (center == undefined)   center = 128;
    if (width == undefined)    width = 127;
    if (freq1 == undefined)    freq1 = .3;
    if (freq2 == undefined)    freq2 = .3;
    if (freq3 == undefined)    freq3 = .3;
    if (phase1 == undefined)    phase1 = 0;
    if (phase2 == undefined)    phase2 = 2;
    if (phase3 == undefined)    phase3 = 4;

		var r = Math.floor(Math.sin(freq1 * i + phase1) * width + center);
		var g = Math.floor(Math.sin(freq2 * i + phase2) * width + center);
		var b = Math.floor(Math.sin(freq3 * i + phase3) * width + center);
    
		return "rgb(" + r + "," + b + "," + g + ")";
  	}
	};
})();