
'use strict'

let flvdemux = require('./flvdemux')
let mp4mux = require('./mp4mux')

let app = {}

let dbp = function() {
	if (app.debug)
		console.log.apply(console, arguments)
}

let concatUint8Array = function(list) {
	let len = 0;
	list.forEach(b => len += b.byteLength)
	let res = new Uint8Array(len);
	let off = 0;
	list.forEach(b => {
		res.set(b, off);
		off += b.byteLength;
	})
	return res;
}

let ADTS_SAMPLING_FREQUENCIES = [
	96000,
	88200,
	64000,
	48000,
	44100,
	32000,
	24000,
	22050,
	16000,
	12000,
	11025,
	8000,
	7350
];

class Streams {
	constructor(urls) {
		this.urls = urls;
		this.streams = [];
		this.moofSeq = 0;
	}

	probe() {
		return Promise.all(this.urls.map((url, i) => {
			return app.fetchU8(url, {end:1024*500}).then(u8 => {
				let hdr = flvdemux.parseInitSegment(u8);
				if (hdr == null)
					return Promise.reject(new Error('probe '+url+' failed'));

				this.streams[i] = hdr;
			})
		})).then(() => {
			this.duration = 0;
			this.keyframes = [];
			this.streams.forEach((stream, s) => {
				stream.duration = stream.meta.duration;
				stream.timeStart = this.duration;
				stream.indexStart = this.keyframes.length;
				this.duration += stream.duration;
				stream.meta.keyframes.times.forEach((time, i) => this.keyframes.push({time:time+stream.timeStart, s, i}));
			})
			this.keyframes.push({time:this.duration, s:this.streams.length, i:0});

			let flvhdr = this.streams[0];
			this.videoTrack = {
				type: 'video',
				id: 1,
				duration: Math.ceil(this.duration*mp4mux.timeScale),
				width: flvhdr.meta.width,
				height: flvhdr.meta.height,
				AVCDecoderConfigurationRecord: flvhdr.firstv.AVCDecoderConfigurationRecord,
			};
			this.audioTrack = {
				type: 'audio',
				id: 2,
				duration: this.videoTrack.duration,
				channelcount: flvhdr.firsta.channelCount,
				samplerate: flvhdr.firsta.sampleRate,
				samplesize: flvhdr.firsta.sampleSize,
				AudioSpecificConfig: flvhdr.firsta.AudioSpecificConfig,
			};
		})
	}

	_locateSegmentRangesByIndex(indexStart, indexEnd) {
		let start = this.keyframes[indexStart];
		let end = this.keyframes[indexEnd];
		let ranges = [];

		for (let s = start.s; s <= end.s; s++) {
			let range = {s};
			if (s == start.s && start.i)
				range.start = start.i;
			if (s == end.s)
				range.end = end.i;
			if (s < this.streams.length && !(s == end.s && range.end == 0))
				ranges.push(range);
		}

		return ranges;
	}

	_getFetchRangesByIndex(indexStart, indexEnd) {
		let ranges = this._locateSegmentRangesByIndex(indexStart, indexEnd);
		return ranges.map(range => {
			let opts = {url: this.urls[range.s], s: range.s};
			let stream = this.streams[range.s];
			opts.start = stream.meta.keyframes.filepositions[range.start || 0];
			if (range.end)
				opts.end = stream.meta.keyframes.filepositions[range.end];
			return opts;
		})
	}

	findNearestIndexByTime(time) {
		let minDiff = this.duration, best;
		this.keyframes.forEach((keyframe, i) => {
			let diff = Math.abs(keyframe.time-time);
			if (diff < minDiff) {
				minDiff = diff;
				best = i;
			}
		})
		return best;
	}

	fetchMediaSegmentsByIndex(indexStart, indexEnd) {
		let ranges = this._getFetchRangesByIndex(indexStart, indexEnd);
		let resbuf = [];
		let fetch = i => {
			let range = ranges[i];
			return app.fetchU8(range.url, {start:range.start, end:range.end}).then(segbuf => {
				let buf = this._transMediaSegments(segbuf, this.streams[range.s].timeStart);
				resbuf.push(buf);
				if (i+1 < ranges.length)
					return fetch(i+1);
			});
		}
		return fetch(0).then(() => concatUint8Array(resbuf));
	}

	fetchMediaSegmentsByTime(timeStart, timeEnd) {
		let indexStart = this.findNearestIndexByTime(timeStart);
		let indexEnd = this.findNearestIndexByTime(timeEnd);
		return this.fetchMediaSegmentsByIndex(indexStart, indexEnd);
	}

	getInitSegment() {
		return mp4mux.initSegment([this.videoTrack, this.audioTrack], this.duration*mp4mux.timeScale);
	}

	_transMediaSegments(segbuf, timeStart) {
		let segpkts = flvdemux.parseMediaSegment(segbuf);

		let lastSample, lastDuration;
		let videoTrack = this.videoTrack;
		let audioTrack = this.audioTrack;

		videoTrack._mdatSize = 0;
		videoTrack.samples = [];
		delete videoTrack.baseMediaDecodeTime;
		audioTrack._mdatSize = 0;
		audioTrack.samples = [];
		delete audioTrack.baseMediaDecodeTime;

		segpkts.filter(pkt => pkt.type == 'video' && pkt.NALUs).forEach((pkt, i) => {
			let sample = {};
			sample._data = pkt.NALUs;
			sample._offset = videoTrack._mdatSize;
			sample.size = sample._data.byteLength;
			videoTrack._mdatSize += sample.size;

			if (videoTrack.baseMediaDecodeTime === undefined) {
				videoTrack.baseMediaDecodeTime = (pkt.dts+timeStart)*mp4mux.timeScale;
			}
			sample._dts = pkt.dts*mp4mux.timeScale;
			sample.compositionTimeOffset = pkt.cts*mp4mux.timeScale;

			sample.flags = {
				isLeading: 0,
				dependsOn: 0,
				isDependedOn: 0,
				hasRedundancy: 0,
				paddingValue: 0,
				isNonSyncSample: pkt.isKeyFrame?1:0,
				degradationPriority: 0,
			};

			if (lastSample) {
				lastSample.duration = sample._dts-lastSample._dts;
				lastDuration = lastSample.duration
			}
			lastSample = sample;
			videoTrack.samples.push(sample);
		});
		lastSample.duration = lastDuration

		lastSample = null;
		segpkts.filter(pkt => pkt.type == 'audio' && pkt.frame).forEach((pkt, i) => {
			let sample = {};
			sample._data = pkt.frame;
			sample._offset = audioTrack._mdatSize;
			sample.size = sample._data.byteLength;
			audioTrack._mdatSize += sample.size;

			if (audioTrack.baseMediaDecodeTime === undefined) {
				audioTrack.baseMediaDecodeTime = (pkt.dts+timeStart)*mp4mux.timeScale;
			}
			sample._dts = pkt.dts*mp4mux.timeScale;

			if (lastSample) {
				lastSample.duration = sample._dts-lastSample._dts;
				lastDuration = lastSample.duration
			}
			lastSample = sample;
			audioTrack.samples.push(sample);
		});
		lastSample.duration = lastDuration
		
		//console.log('audio',audioTrack.samples.length, 'video',videoTrack.samples.length)
		//console.log('audioStart', audioTrack.baseMediaDecodeTime/mp4mux.timeScale)
		//console.log('videoStart', videoTrack.baseMediaDecodeTime/mp4mux.timeScale)

		let moof, _mdat, mdat;
		let list = [];

		moof = mp4mux.moof(this.moofSeq++, [videoTrack]);
		_mdat = new Uint8Array(videoTrack._mdatSize);
		videoTrack.samples.forEach(sample => _mdat.set(sample._data, sample._offset));
		mdat = mp4mux.mdat(_mdat);
		list = list.concat([moof, mdat]);

		moof = mp4mux.moof(0, [audioTrack]);
		_mdat = new Uint8Array(audioTrack._mdatSize);
		audioTrack.samples.forEach(sample => _mdat.set(sample._data, sample._offset));
		mdat = mp4mux.mdat(_mdat);
		list = list.concat([moof, mdat]);

		return concatUint8Array(list);
	}
}

app.fetchU8 = (url, opts) => app.fetchAB(url, opts).then(ab => new Uint8Array(ab))

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

app.bindVideo = (video, urls) => {
	let streams = new Streams(urls);

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

	let needSeekToTime = null;

	let prefetching = false;
	let lastPrefetchId;
	let prefetchMediaSegmentsByTime = (time, len) => {
		len = len || 10.0;
		dbp('prefetch', time, time+len);

		prefetching = true;
		lastPrefetchId = Math.random();
		((id) => {
			streams.fetchMediaSegmentsByTime(time, time+len).then(buf => {
				if (lastPrefetchId == id) {
					sourceBuffer.appendBuffer(buf)
					prefetching = false;
				}
			})
		})(lastPrefetchId);
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
		let buffered = sourceBuffer.buffered;
		for (let i = 0; i < buffered.length; i++) {
			if (time > buffered.start(i) && time < buffered.end(i)) {
				return true;
			}
		}
	}

	let indexIsBuffered = index => {
		let timeStart = streams.keyframes[index].time, timeEnd;
		for (let i = index; i < streams.keyframes.length; i++) {
			timeEnd = streams.keyframes[i].time;
			if (timeEnd > timeStart)
				break;
		}
		let time = (timeStart+timeEnd)/2;
		return timeIsBuffered(time);
	}

	let timeupdateCounter = 0;
	video.addEventListener('timeupdate', () => {
		timeupdateCounter++;
		if (timeupdateCounter < 6)
			return;
		timeupdateCounter = 0;

		let buffered = sourceBuffer.buffered;
		if (buffered.length == 0)
			return;

		let time = video.currentTime + 10.0;
		if (!timeIsBuffered(time) && !prefetching) {
			let start = buffered.end(buffered.length-1);
			prefetchMediaSegmentsByTime(start);
		}

		if (buffered.end(0) - buffered.start(0) > 120.0) {
			let keep = 10.0;
			if (!sourceBuffer.updating && video.currentTime > keep) 
				sourceBuffer.remove(0, video.currentTime-keep);
		}
	});

	video.addEventListener('seeking', debounce(() => {
		dbp('video seeking:', video.currentTime)

		let index = streams.findNearestIndexByTime(video.currentTime);
		let time = streams.keyframes[index].time;
		if (indexIsBuffered(index)) {
			if (video.currentTime < time || video.currentTime > time + 0.3) {
				dbp('video seeking:', 'seek to buffered keyframe', time);
				video.currentTime = time;
			}
		} else {
			dbp('video seeking:', 'need load segment', time);
			prefetchMediaSegmentsByTime(time);
			sourceBuffer.remove(0, video.duration);
			needSeekToTime = time;
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
				if (needSeekToTime !== null && Math.abs(needSeekToTime-time) < 1.0) {
					dbp('sourceBuffer: seek to', time);
					video.currentTime = time;
					video.play();
					needSeekToTime = null;
				}
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
				sourceBuffer.appendBuffer(streams.getInitSegment());
				needSeekToTime = 0.0;
				prefetchMediaSegmentsByTime(0.0);
			})

		}
	});
}

module.exports = app;

