
module.exports = () => {
	let div = document.createElement('div');
	div.innerHTML = `<video></video>`;
	div.style.background = '#000';
	div.style.position = 'fixed';
	div.style.top = '0px';
	div.style.left = '0px';
	div.style.zIndex = '999999';

	let video = div.querySelector('video');
	video.autoplay = true;
	video.controls = true;
	video.style.position = 'absolute';
	video.style.display = 'none';

	let self = {video, div, onStarted: [], onSuspend: [], onResume: []};

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
	}

	let onStarted = () => {
		video.style.display = 'block';
		video.removeEventListener('canplay', onStarted);
		resize();
		self.onStarted.forEach(cb => cb());
	}
	video.addEventListener('canplay', onStarted);

	let toggleFullScreen = () => {
		if (!document.webkitFullscreenElement) {
			div.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
		} else {
			document.webkitCancelFullScreen();
		}
	}

	let togglePlayPause;
	{
		let playing = false;
		let timer;

		let setToPaused = () => {
			if (playing) {
				playing = false;
				self.onSuspend.forEach(x => x());
				console.log('player: suspend');
			}
		}

		let setToPlaying = () => {
			if (!playing) {
				playing = true;
				self.onResume.forEach(x => x());
				console.log('player: resume');
			}
		}

		video.addEventListener('timeupdate', () => {
			if (video.paused)
				return;
			setToPlaying();
			if (timer) {
				clearTimeout(timer);
			}
			timer = setTimeout(() => {
				setToPaused();
				timer = null;
			}, 1000);
		});

		togglePlayPause = () => {
			if (video.paused) {
				video.play();
			} else {
				video.pause();
				setToPaused();
			}
		}
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

	let seekDelta = 5.0;
	let getSeekTime = (delta) => {
		let inc = delta>0?1:-1;
		let index = self.streams.findIndexByTime(video.currentTime);
		let keyframes = self.streams.keyframes;
		for (let i = index; i >= 0 && i < keyframes.length; i += inc) {
			let e = keyframes[i];
			if (Math.abs(e.timeStart-video.currentTime) > Math.abs(delta)) {
				index = i;
				break;
			}
		}
		let time = self.streams.keyframes[index].timeStart;
		video.currentTime = time;
	};
	let seekBack = () => {
		video.currentTime = getSeekTime(-seekDelta);
	}
	let seekForward = () => {
		video.currentTime = getSeekTime(seekDelta);
	}

	let volumeDelta = 0.2;
	let volumeUp = () => {
		video.volume = Math.min(1.0, video.volume+volumeDelta);
	}
	let volumeDown = () => {
		video.volume = Math.max(0, video.volume-volumeDelta);
	}

	let toggleMute = () => {
		video.muted = !video.muted;
	}

	document.body.addEventListener('keydown', (e) => {
		switch (e.code) {
			case "Space": {
				togglePlayPause();
				e.preventDefault();
			} break;

			case "ArrowUp": {
				volumeUp();
				e.preventDefault();
			} break;

			case "KeyM": {
				toggleMute();
				e.preventDefault();
			} break;

			case "ArrowDown": {
				volumeDown();
				e.preventDefault();
			} break;

			case "ArrowLeft": {
				seekBack();
				e.preventDefault();
			} break;

			case "ArrowRight": {
				seekForward();
				e.preventDefault();
			} break;

			case "Enter": {
				if (e.metaKey || e.ctrlKey) {
					toggleFullScreen();
					e.preventDefault();
				}
			} break;
		}

	});

	document.body.style.margin = 0;
	document.body.appendChild(div);
	resize();
	window.addEventListener('resize', resize);

	return self;
}

