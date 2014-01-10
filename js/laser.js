var numberOfLasers = 0;

function Laser(ctx) {
	this.ctx = ctx;
	this.step = 0;
}

Laser.placeLasers = function(){
	return _(numberOfLasers).times(function(i){
				return new Laser(foreground.ctx);
			});
};

Laser.prototype.move = function(){	
	if(this.step > this.speed)
		this.retarget()
	this.step++;
	this.ctx.strokeStyle = this.stroke;
	this.ctx.beginPath();
	this.ctx.lineWidth = 3;
  this.ctx.moveTo(this.x, this.y);
  this.x += this.dx / this.speed;
  this.y += this.dy / this.speed;
  this.ctx.lineTo(this.x, this.y);
  this.ctx.closePath();
  this.ctx.stroke();
}

Laser.prototype.retarget = function(){
	if(this.end)
		this.end.bonked = this.stroke;
	this.start && this.start.targeted--;
	this.start = this.end || _.sample(foreground.nodes);
	this.end   = _.sample(foreground.nodes);
	this.end.targeted++;
	this.stroke = this.start.color;
	this.x = this.start.x;
	this.y = this.start.y;
	this.dx = this.end.x - this.start.x;
	this.dy = this.end.y - this.start.y;
	this.speed = distance(this.start, this.end) / 10;
	this.step = 0;
};