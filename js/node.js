function Node(ctx){
	this.ctx = ctx;
	this.x = (rand(width) / 10).toFixed() * 10; 
	this.y = (rand(height)/ 10).toFixed() * 10;
}

Node.prototype.paint = function(){
	this.ctx.beginPath();
	this.ctx.fillStyle = 'red';
	this.ctx.fillRect(this.x,this.y,4,4);
};

Node.prototype.move = function(){
	rand(2) === 0 ? this.x++ : this.x--; 
	rand(2) === 0 ? this.y++ : this.y--; 
}
