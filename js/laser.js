function Laser(ctx, nodes) {
	this.ctx = ctx;
	this.start = nodes[0];
	this.end   = nodes[1];
	this.x = this.start.x;
	this.y = this.start.y;
	this.dx = this.end.x - this.start.x;
	this.dy = this.end.y -this.start.y;
	this.step = 0;
	this.stroke = color.next();
}

Laser.prototype.move = function(){
	this.step++;
	this.ctx.strokeStyle = this.stroke;
	this.ctx.beginPath();
	this.ctx.lineWidth = 3;
  this.ctx.moveTo(this.x, this.y);
  this.x += this.dx / 10;
  this.y += this.dy / 10;
  this.ctx.lineTo(this.x, this.y);
  this.ctx.closePath();
  this.ctx.stroke();
}

Laser.prototype.retarget = function(nodes){
	this.start = this.end;
	this.end   = _.sample(nodes);
	this.stroke = color.next();
	this.dx = this.end.x - this.start.x;
	this.dy = this.end.y - this.start.y;
	this.step = 0;
};