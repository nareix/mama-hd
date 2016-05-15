
safari.self.addEventListener("message", function(theMessageEvent){
	if (theMessageEvent.name == 'MAMA-HD') {
		if (window === window.top) {
			(function(s){
				s=document.body.appendChild(document.createElement('script'));
				s.src=safari.extension.baseURI+'bundle.js';
				s.charset='UTF-8';}())
		}
	}
}, false);
