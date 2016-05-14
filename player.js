
module.exports = () => {
	let div = document.createElement('div');
	let damoo = document.createElement('div');
	let video = document.createElement('video');

	let toolbar = document.createElement('div');
	toolbar.className = 'mama-toolbar';
	toolbar.innerHTML += `<input class="damoo-input" type="range" />` 
	toolbar.innerHTML += `<svg version="1.1" 
		class="damoo" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
		viewBox="0 0 60 60" style="enable-background:new 0 0 60 60;" xml:space="preserve">
		<path d="M6,2h48c3.252,0,6,2.748,6,6v33c0,3.252-2.748,6-6,6H25.442L15.74,57.673C15.546,57.885,15.276,58,15,58
			c-0.121,0-0.243-0.022-0.361-0.067C14.254,57.784,14,57.413,14,57V47H6c-3.252,0-6-2.748-6-6L0,8C0,4.748,2.748,2,6,2z"/>
		</svg>
	`;
	toolbar.style.display = 'none';

	div.appendChild(toolbar);
	div.appendChild(video);
	div.appendChild(damoo);

	div.style.background = '#000';
	div.style.position = 'fixed';
	div.style.top = '0px';
	div.style.left = '0px';
	div.style.zIndex = '1000000';

	damoo.style.position = 'absolute';
	damoo.style.pointerEvents = 'none';
	damoo.style.overflow = 'hidden';

	video.autoplay = true;
	video.controls = true;
	video.style.position = 'absolute';
	video.style.display = 'none';

	function debounce(start, end, interval) {
		var timer;
		return function() {
			var context = this, args = arguments;
			var later = function() {
				timer = null;
				end.apply(context, args);
			};
			if (timer) {
				clearTimeout(timer);
			} else {
				start.apply(context, args);
			}
			timer = setTimeout(later, interval);
		};
	};

	div.addEventListener('mousemove', debounce(() => {
		div.style.cursor = 'default';
		toolbar.style.display = 'flex';
	}, () => {
		div.style.cursor = 'none';
		toolbar.style.display = 'none';
	}, 5000));

	let self = {
		video, damoo, div,
		onStarted:[], onSuspend:[], onResume:[],
		damooEnabled:false,
		damooOpacity:1.0,
		onDamooOptsChange:[],
	};

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
		damoo.style.width = video.style.width;
		damoo.style.height = video.style.height;
		damoo.style.top = video.style.top;
		damoo.style.left = video.style.left;
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
				console.log('player: suspend');
				self.onSuspend.forEach(x => x());
			}
		}

		let setToPlaying = () => {
			if (!playing) {
				playing = true;
				console.log('player: resume');
				self.onResume.forEach(x => x());
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

	video.addEventListener('mousedown', () => {
		togglePlayPause();
	})

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
		if (video.muted) {
			video.muted = false;
			video.volume = 0.0;
		}
		video.volume = Math.min(1.0, video.volume+volumeDelta);
	}
	let volumeDown = () => {
		video.volume = Math.max(0, video.volume-volumeDelta);
	}

	let toggleMute = () => {
		video.muted = !video.muted;
	}

	let toggleDamoo;
	{
		let btn = toolbar.querySelector('.damoo');
		let input = toolbar.querySelector('.damoo-input');
		input.min = 0;
		input.max = 1;
		input.step = 0.01;
		input.value = self.damooOpacity;
		if (self.damooEnabled) {
			btn.classList.add('selected');
			input.style.display = 'block';
		} else {
			input.style.display = 'none';
		}
		toggleDamoo = () => {
			btn.classList.toggle('selected');
			self.damooEnabled = !self.damooEnabled;
			if (self.damooEnabled) {
				input.style.display = 'block';
			} else {
				input.style.display = 'none';
			}
			self.onDamooOptsChange.forEach(x => x());
		}
		btn.addEventListener('click', () => {
			toggleDamoo();
		});
		input.addEventListener('change', () => {
			self.damooOpacity = input.value;
			self.onDamooOptsChange.forEach(x => x());
		});
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

			case "KeyD": {
				toggleDamoo();
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

