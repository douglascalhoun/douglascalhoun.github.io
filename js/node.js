var numberOfNodes = 70,
		rotation = 0.01;

function Node(x, y, angle, i, j, d){
	this.angle = angle;
	this.id = i;
	this.jd = j;
	this.d = d;
	this.ctx = foreground.ctx;
	this.x = x; 
	this.y = y;
	this.color = color.next(x,y,i);
	this.targeted = 0;
	this.target = {};
	this.bonked = false;
	this.size = 4
}

Node.placeNodes = function(){
	return _.flatten(_(numberOfNodes).times(function(i){
		var angle = 2 * Math.PI * (i/numberOfNodes);
		return _(numberOfNodes).times(function(j){
			var innerAngle = 2 * Math.PI * (j/numberOfNodes)
			var x = Math.sin(angle + j * 5) * 60 * innerAngle + width/2;
			var y = Math.cos(angle + j * 5) * 60 * innerAngle + height/2;
			var d = Math.sqrt(x*x + y*y);
			return new Node(x, y, angle, i, j, d);
		});
	}));
}

Node.prototype.changeColor = function(){
	return this.color;
}

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
	var dx = this.x - width/2;
	var dy = this.y - height/2;

	this.x = (dx * Math.cos(rotation) - dy * Math.sin(rotation)) + width/2;
	this.y = (dx * Math.sin(rotation) + dy * Math.cos(rotation)) + height/2;
	this.angle = 2 * Math.PI * (this.id/config.angle_devisor);
}

Node.prototype.findClosest = function(){
	return _(_(foreground.nodes).without(this)).min(function(n){
		return distance(this, n);
	},this);
};

