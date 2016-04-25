
module.exports = () => {
	let div = document.createElement('div');
	div.innerHTML = `
		<video></video>
	`;
	div.style.background = '#000';
	div.style.position = 'fixed';
	div.style.top = '0px';
	div.style.left = '0px';
	div.style.zIndex = '999999';

	let video = div.querySelector('video');
	video.controls = true;
	video.style.position = 'absolute'
	video.style.display = 'none'

	let self = {video, div};

	let resize = () => {
		let windowRatio = window.innerHeight/window.innerWidth;
		let videoRatio = video.videoHeight/video.videoWidth;

		if (videoRatio > windowRatio) {
			let width = window.innerHeight/videoRatio;
			video.style.height = window.innerHeight+'px';
			video.style.width = width+'px';
			video.style.left = (window.innerWidth-width)/2+'px';
			video.style.top = '0px';
		} else {
			let height = window.innerWidth*videoRatio;
			video.style.width = window.innerWidth+'px';
			video.style.height = height+'px';
			video.style.top = (window.innerHeight-height)/2+'px';
			video.style.left = '0px';
		}

		div.style.height = window.innerHeight+'px';
		div.style.width = window.innerWidth+'px';

		//console.log('resize', window.innerHeight, window.innerWidth, video.videoHeight, video.videoWidth)
		//console.log('resizeResult', div.style.width, div.style.height, video.style.width, video.style.height)
	}
	window.addEventListener('resize', resize);

	let onStarted = () => {
		video.style.display = 'block';
		video.removeEventListener('canplay', onStarted);
		resize();
		if (self.onStarted)
			self.onStarted();
	}
	video.addEventListener('canplay', onStarted);

	let toggleFullScreen = () => {
		if (!document.webkitFullscreenElement) {
			div.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
		} else {
			document.webkitCancelFullScreen();
		}
	}

	let togglePlayPause = () => {
		if (video.paused)
			video.play();
		else
			video.pause();
	}

	function doubleclick(el, onsingle, ondouble) {
		let dbl;
		return () => {
			if (!dbl) {
				dbl = true;
				setTimeout(function () {
					if (dbl) {
						onsingle();
					}
					dbl = false;
				}, 300);
			} else {
				dbl = false;
				ondouble();
			}
		}
	}

	video.addEventListener('mousedown', doubleclick(video, () => {
		togglePlayPause();
	}, () => {
		toggleFullScreen();
	}))

	let fastSeekInterval = 20.0;

	let emitSeekBack = () => {
		let time = self.streams.findNearestIndexTimeByTime(video.currentTime-fastSeekInterval);
		video.currentTime = time;
	}

	let emitSeekForward = () => {
		let time = self.streams.findNearestIndexTimeByTime(video.currentTime+fastSeekInterval);
		video.currentTime = time;
	}

	document.body.addEventListener('keydown', (e) => {
		switch (e.code) {
			case "Space": {
				togglePlayPause();
			} break;

			case "ArrowLeft": {
				emitSeekBack();
			} break;

			case "ArrowRight": {
				emitSeekForward();
			} break;

			case "Enter": {
				if (e.metaKey || e.ctrlKey)
					toggleFullScreen();
			} break;
		}
	});

	document.body.style.margin = 0;
	document.body.appendChild(div);

	return self;
}

