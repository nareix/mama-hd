
function fetchAB(url, cb) {
	let xhr = new XMLHttpRequest;
	xhr.open('get', url);
	xhr.responseType = 'arraybuffer';
	xhr.onload = function () {
		cb(xhr.response);
	};
	xhr.send();
};

app.fetchAB = (url, _opts) => {
	let range;
	let opts = {};
	if (_opts.start || _opts.end) {
		range = '';
		if (_opts.start)
			range += _opts.start;
		else
			range += '0';
		range += '-'
		if (_opts.end)
			range += _opts.end-1;
	}

	if (range !== undefined) {
		opts.headers = {Range: range}
	}
	return fetch(url, opts).then(res => res.arrayBuffer());
}

let dbp = function() {
	console.log.apply(console, arguments)
}

function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

if (1) {
	let video = document.createElement('video');
	video.controls = true;
	video.style.width = '1000px'
	video.volume = 0.2;

	let urls = [];
	for (let i = 0; i < 4; i++)
		urls.push('http://localhost:8080/projectindex-'+i+'.flv');
	let streams = new app.Streams(urls);

	let mediaSource = new MediaSource();
	let sourceBuffer;

	let findTimeRange = (time, buffered) => {
		for (let i = 0; i < buffered.length; i++) {
			if (time >= buffered.start(i) && time < buffered.end(i)) {
				return {start:buffered.start(i), end:buffered.end(i)};
			}
		}
	}

	// updateend: if currentTime not buffered set to nearby buffered start
	// seeking: if currentTime nearest keyframe not buffered load media segment else set to it

	video.src = URL.createObjectURL(mediaSource);
	document.body.appendChild(video);

	let prefetchMediaSegmentsByTime = (time) => {
		streams.fetchMediaSegmentsByTime(time, time+20.0).then(buf => {
			sourceBuffer.appendBuffer(buf)
		})
	}

	let findNearestBufferedStartByTime = time => {
		let minDiff = streams.duration, best;
		let buffered = sourceBuffer.buffered;
		for (let i = 0; i < buffered.length; i++) {
			let val = buffered.start(i);
			let diff = Math.abs(time - val);
			if (diff < minDiff) {
				minDiff = diff;
				best = val;
			}
		}
		return best;
	}

	let timeIsBuffered = time => {
		let delta = 0.3;
		let buffered = sourceBuffer.buffered;
		for (let i = 0; i < buffered.length; i++) {
			if (time > buffered.start(i)-delta && time < buffered.end(i)+delta) {
				return true;
			}
		}
	}

	video.addEventListener('timeupdate', () => {
		dbp('timeupdate:', video.currentTime);
	});

	video.addEventListener('seeking', debounce(() => {
		dbp('seeking:', video.currentTime)

		let index = streams.findNearestIndexByTime(video.currentTime);
		let time = streams.keyframes[index].time;
		if (timeIsBuffered(time)) {
			if (Math.abs(video.currentTime-time) > 0.3) {
				dbp('seeking:', 'to nearest keyframe', time);
				video.currentTime = time;
			}
		} else {
			dbp('seeking:', 'load segment', time);
			video.currentTime = time;
			prefetchMediaSegmentsByTime(time);
		}
	}, 200))

	mediaSource.addEventListener('sourceended', () => {
		dbp('mediaSource: sourceended')
	})

	mediaSource.addEventListener('sourceclose', () => {
		dbp('mediaSource: sourceclose')
	})

	mediaSource.addEventListener('sourceopen', e => {
		if (mediaSource.sourceBuffers.length > 0)
			return;

		sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');

		sourceBuffer.addEventListener('updatestart', () => {
			dbp('sourceBuffer: updatestart')
		});

		sourceBuffer.addEventListener('update', () => {
			dbp('sourceBuffer: update')
		});

		sourceBuffer.addEventListener('updateend', () => {
			dbp('sourceBuffer: updateend')

			let ranges = [];
			let buffered = sourceBuffer.buffered;
			for (let i = 0; i < buffered.length; i++) {
				ranges.push([buffered.start(i), buffered.end(i)]);
			}
			dbp('sourceBuffer: buffered', JSON.stringify(ranges), 'currentTime', video.currentTime);

			if (sourceBuffer.buffered.length > 0) {
				let time = findNearestBufferedStartByTime(video.currentTime);
				dbp('sourceBuffer: seek to', time);
				video.currentTime = time;
				video.play();
			}
		});

		sourceBuffer.addEventListener('error', () => {
			dbp('sourceBuffer: error')
		});

		sourceBuffer.addEventListener('abort', () => {
			dbp('sourceBuffer: abort')
		});

		let localurl = 'http://localhost:8080/'
		let useMine = true;

		if (!useMine) {
			fetch(localurl+'frag_bunny.mp4.fraginfo.json')
			.then(res => res.json()).then(info => {
				console.log(info);
				app.fetchU8(localurl+'frag_bunny.mp4', {end:info.InitSegEnd})
				.then(u8 => {
					console.log('loaded InitSeg', u8.byteLength)
					sourceBuffer.appendBuffer(u8);
					let entries = info.Entries;
					console.log(JSON.stringify(entries.slice(0,10)))
					let loadSeg = n => app.fetchU8(
						localurl+'frag_bunny.mp4', {start:entries[4*n].Start,end:entries[4*n+1].End})
						.then(u8 => {
							console.log('loaded', n);
							sourceBuffer.appendBuffer(u8);
						});
					loadSeg(4).then(() => loadSeg(5)).then(() => loadSeg(8))
				});
			})

		} else {
			streams.probe().then(() => {
				sourceBuffer.appendBuffer(streams.getInitSegment())
				let start = streams.streams[3].indexStart;
				dbp(streams.keyframes.length, start)
				streams.fetchMediaSegmentsByIndex(start-5, start+5).then(buf => {
					sourceBuffer.appendBuffer(buf)
				})
			})

		}
	});
}

if (0) {
	let urls = [];
	for (let i = 0; i < 4; i++)
		urls.push('http://localhost:8080/projectindex-'+i+'.flv');
	let streams = new app.Streams(urls);

	streams.probe().then(() => {
		console.log('probe done', streams.duration/60.)
		let start = streams.streams[0].timeStart+40;
		let end = start+50;
		let range = streams._getFetchRanges(start, end);
		console.log('range', JSON.stringify(range))
	})
}

if (0) {
	fetchAB('http://localhost:8080/mofa.flv', ab => {
		let uint8arr = new Uint8Array(ab);
		let initseg = uint8arr.slice(0, 1024*100);

		let start = new Date().getTime();
		let flvhdr = flvdemux.parseInitSegment(initseg);
		console.log((new Date().getTime()-start)/1e3)

		let keyframes = flvhdr.meta.keyframes;

		start = new Date().getTime();
		let nr = 10;
		for (let i = 0; i < nr; i++) {
			let start = 4;
			let end = 7;
			let time = keyframes.times[end]-keyframes.times[start];
			let segbuf = uint8arr.slice(keyframes.filepositions[start], keyframes.filepositions[end]);
			let file = app.testmux(flvhdr, segbuf).file;

			console.log('time(s)',time, 'filesize(MB)',file.byteLength/1024/1024);
		}
		console.log('used(ms)', (new Date().getTime()-start)/nr)
	});
}


