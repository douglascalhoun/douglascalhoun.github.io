var numberOfLasers = numberOfNodes * 3;

function Laser(i) {
	this.ctx = foreground.ctx;
	this.step = 0;
	this.id = i;
	this.direction = 1;
	var startingNode = i;
	this.start = foreground.nodes[startingNode];
	this.end = foreground.nodes[startingNode + 1 ] || foreground.nodes[0];
	this.retarget();
}

Laser.placeLasers = function(){
	return _(numberOfLasers).times(function(i){
				return new Laser(i);
			});
};

Laser.prototype.move = function(){
	if(this.step > this.speed){
		this.retarget();
	}
	this.step++;
	this.ctx.strokeStyle = this.color;
	this.ctx.beginPath();
	this.ctx.lineWidth = 3;
  this.ctx.moveTo(this.x, this.y);
  this.x += this.dx / this.speed;
  this.y += this.dy / this.speed;
  this.ctx.lineTo(this.x, this.y);
  this.ctx.closePath();
  this.ctx.stroke();
};

Laser.prototype.retarget = function(){
	this.end.bonked = this.color;
	this.start && this.start.targeted--;
	this.start = this.end;
	console.log("node: " + this.end.id);
	this.end = foreground.nodes[(this.end.id + 1)] || _(foreground.nodes).sample();
	this.end.targeted++;
	this.color = this.start.color;
	this.x = this.start.x;
	this.y = this.start.y;
	var dx = this.end.x - cx;
	var dy = this.end.y - cy;
	this.speed = distance(this.start, this.end) / 10;
	var endX = (dx * Math.cos(rotation * this.speed) - dy * Math.sin(rotation * this.speed)) + cx;
	var endY = (dx * Math.sin(rotation * this.speed) + dy * Math.cos(rotation * this.speed)) + cy;
	this.dx = endX - this.start.x;
	this.dy = endY - this.start.y;
	this.step = 0;
};