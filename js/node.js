var numberOfNodes = 30,
		rotation = 0.01,
		id = 0;

function Node(x, y, angle){
	this.angle = angle;
	this.id = id++;
	this.d = Math.sqrt(x*x + y*y);
	this.ctx = foreground.ctx;
	this.x = x;
	this.y = y;
	// this.color = 'black';
	this.color = color.makeColor(id);
	this.targeted = 0;
	this.target = {};
	this.bonked = false;
	this.size = 4;
}

Node.placeNodes = function(){
	return _.flatten(_(numberOfNodes).times(function(i){
		var angle =  2 * Math.PI * (i/numberOfNodes);
		return _(numberOfNodes).times(function(j){
			j = j + 1;
			var amplitude = 2 * Math.PI * (j/numberOfNodes);
			var x = Math.sin(angle + j/3) * 55 * amplitude + cx;
			var y = Math.cos(angle + j/3) * 55 * amplitude + cy;
			return new Node(x, y, angle);
		});
	}));
};

Node.prototype.changeColor = function(){
	return this.color;
};

Node.prototype.paint = function(){
	if(this.bonked){
		this.bonked = false;
		this.color = this.changeColor();
	}

	this.move();

	this.ctx.beginPath();
	this.ctx.fillStyle = this.color;
	this.ctx.fillRect(this.x - (Math.floor(this.size / 2)),this.y - (Math.floor(this.size / 2)) ,this.size,this.size);
};

Node.prototype.destruct = function(){
	foreground.nodes = _(foreground.nodes).without(this);
};

Node.prototype.move = function(){
	var dx = this.x - cx;
	var dy = this.y - cy;

	this.x = (dx * Math.cos(rotation) - dy * Math.sin(rotation)) + cx;
	this.y = (dx * Math.sin(rotation) + dy * Math.cos(rotation)) + cy;
	this.angle = 2 * Math.PI * (this.id/config.angle_devisor);
};

Node.prototype.findClosest = function(){
	return _(_(foreground.nodes).without(this)).min(function(n){
		return distance(this, n);
	},this);
};