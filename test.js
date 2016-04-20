
function fetchAB(url, cb) {
	var xhr = new XMLHttpRequest;
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

if (1) {
	let video = document.createElement('video');
	video.controls = true;
	video.style.width = '800px'

	let mediaSource = new MediaSource();
	video.src = URL.createObjectURL(mediaSource);
	document.body.appendChild(video);

	mediaSource.addEventListener('sourceended', () => {
		console.log('mediaSource: sourceended')
	})

	mediaSource.addEventListener('sourceclose', () => {
		console.log('mediaSource: sourceclose')
	})

	mediaSource.addEventListener('sourceopen', () => {
		if (mediaSource.sourceBuffers.length > 0)
			return;

		let sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');

		sourceBuffer.addEventListener('updatestart', () => {
			dbp('sourceBuffer: updatestart')
		});

		sourceBuffer.addEventListener('update', () => {
			dbp('sourceBuffer: update')
		});

		sourceBuffer.addEventListener('updateend', () => {
			dbp('sourceBuffer: updateend')
			var ranges = [];
			var buffered = sourceBuffer.buffered;
			for (var i = 0; i < buffered.length; i++) {
				ranges.push([buffered.start(i), buffered.end(i)]);
			}
			if (ranges.length > 0) {
				video.currentTime = ranges[0][0];
				video.volume = 0.3;
				video.play();
			}
			console.log('sourceBuffer: buffered', JSON.stringify(ranges));
		});

		sourceBuffer.addEventListener('error', () => {
			dbp('sourceBuffer: error')
		});

		sourceBuffer.addEventListener('abort', () => {
			dbp('sourceBuffer: abort')
		});

		let localurl = 'http://localhost:8080/'
		let useMine = false;

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
			let urls = [];
			for (let i = 0; i < 4; i++)
			urls.push('http://localhost:8080/projectindex-'+i+'.flv');
			let streams = new app.Streams(urls);
			streams.probe().then(() => {
				sourceBuffer.appendBuffer(streams.getInitSegment())
				let start = streams.streams[1].timeStart;
				//let start = 10;
				streams.fetchMediaSegments(start-10, start+10).then(buf => {
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


