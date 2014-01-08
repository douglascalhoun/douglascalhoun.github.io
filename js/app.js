
function step(){
	foreground.paint();	
	requestAnimationFrame(step);
}

background.paint();
requestAnimationFrame(step);