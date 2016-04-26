
//TODO
// [DONE] sourceBuffer: opeartion queue
// [DONE] seek to keyframe problem

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

app.fetchAB = (url, _opts) => {
	let range;
	let opts = {};
	if (_opts.start || _opts.end) {
		range = 'bytes=';
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

class Streams {
	constructor({urls,fakeDuration}) {
		if (fakeDuration == null)
			throw new Error('fakeDuration must set');
		this.urls = urls;
		this.fakeDuration = fakeDuration;
		this.streams = [];
		this.probeIdx = 0;
	}

	probeFirst() {
		return this.probeOneByOne();
	}

	fetchInitSegment(url) {
		let parser = new flvdemux.InitSegmentParser();
		let pump = reader => {
			return reader.read().then(res => {
				if (res.done) {
					//dbp('initsegparser: EOF');
					return;
				}
				let chunk = res.value;
				//dbp(`initsegparser: incoming ${chunk.byteLength}`);
				let done = parser.push(chunk);
				if (done) {
					//dbp('initsegparser: finished', done);
					reader.cancel();
					return done;
				} else {
					return pump(reader);
				}
			});
		}
		let headers = new Headers();
		headers.append('Range', 'bytes=0-5000000');
		return fetch(url, {headers}).then(res => pump(res.body.getReader()));
	}

	probeOneByOne() {
		let url = this.urls[this.probeIdx];
		return this.fetchInitSegment(url).then(hdr => {
			if (hdr == null)
				return Promise.reject(new Error('probe '+url+' failed'));

			this.streams.push(hdr);
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

			if (this.probeIdx == 0) {
				let flvhdr = this.streams[0];
				this.videoTrack = {
					type: 'video',
					id: 1,
					duration: Math.ceil(this.fakeDuration*mp4mux.timeScale),
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
			}

			this.probeIdx++;
			dbp(`probe: got ${this.probeIdx}/${this.urls.length}`);

			if (this.probeIdx == this.urls.length) {
				if (this.onProbeDone)
					this.onProbeDone();
			} else {
				this.probeOneByOne();
			}
		});
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

	findNearestIndexTimeByTime(time) {
		return this.keyframes[this.findNearestIndexByTime(time)].time;
	}

	findNearestIndexByTime(time) {
		let minDiff = this.duration, best;

		this.keyframes.forEach((keyframe, i) => {
			let diff = time-keyframe.time;
			let absDiff = Math.abs(diff);
			if (absDiff < minDiff) {
				minDiff = absDiff;
				best = i;
			}
		})
		return best;
	}

	fetchMediaSegmentsByIndex(indexStart, indexEnd) {
		let ranges = this._getFetchRangesByIndex(indexStart, indexEnd);
		if (ranges.length == 0)
			throw new Error('empty range, maybe video end');

		{
			let ts = this.keyframes[indexStart].time;
			let te = this.keyframes[indexEnd].time;
			dbp('fetch:', `index=[${indexStart},${indexEnd}] time=[${ts},${te}]`);
		}

		let resbuf = [];
		let fulfill;
		let xhr;

		let promise = new Promise((_fulfill, reject) => {
			fulfill = _fulfill;

			let request = i => {
				let range = ranges[i];
				let {url,start,end} = range;
				xhr = new XMLHttpRequest();
				xhr.open('GET', url);
				xhr.responseType = 'arraybuffer';
				{
					let range;
					if (start || end) {
						range = 'bytes=';
						if (start)
							range += start;
						else
							range += '0';
						range += '-'
						if (end)
							range += end-1;
					}
					if (range !== undefined) {
						xhr.setRequestHeader('Range', range);
					}
				}
				xhr.onerror = reject;

				let onload = ab => {
					let segbuf = new Uint8Array(ab);
					let cputimeStart = new Date().getTime();
					let {buf, duration} = this.transcodeMediaSegments(segbuf, this.streams[range.s].timeStart);
					let cputimeEnd = new Date().getTime();
					dbp('transcode: cputime(ms):', (cputimeEnd-cputimeStart), 
							'segbuf(MB)', segbuf.byteLength/1e6,
							'videotime(s)', duration
						 );
					resbuf.push(buf);
					if (i+1 < ranges.length) {
						request(i+1);
					} else {
						fulfill(concatUint8Array(resbuf));
					}
				}

				xhr.onload = function(e) {
					onload(this.response);
				};

				xhr.send();
			}

			request(0);
		});

		promise.cancel = () => {
			xhr.abort();
			fulfill();
		};

		return promise;
	}

	fetchMediaSegmentsByTime(timeStart, timeEnd) {
		let indexStart = this.findNearestIndexByTime(timeStart);
		let indexEnd = this.findNearestIndexByTime(timeEnd);
		return this.fetchMediaSegmentsByIndex(indexStart, indexEnd);
	}

	getInitSegment() {
		return mp4mux.initSegment([this.videoTrack, this.audioTrack], this.fakeDuration*mp4mux.timeScale);
	}

	transcodeMediaSegments(segbuf, timeStart) {
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

			//dbp('timeStart', timeStart)
			//dbp('videosample', pkt.dts, pkt.isKeyFrame);

			sample.flags = {
				isLeading: 0,
				dependsOn: 0,
				isDependedOn: 0,
				hasRedundancy: 0,
				paddingValue: 0,
				isNonSyncSample: pkt.isKeyFrame?0:1,
				degradationPriority: 0,
			};

			if (lastSample) {
				lastSample.duration = sample._dts-lastSample._dts;
				lastDuration = lastSample.duration;
			}
			lastSample = sample;
			videoTrack.samples.push(sample);
		});
		// If not set last sample's duration, then audio discontinous problem solved
		// I don't know why ....
		//lastSample.duration = lastDuration;

		lastSample = null;
		segpkts.filter(pkt => pkt.type == 'audio' && pkt.frame).forEach((pkt, i) => {
			let sample = {};
			sample._data = pkt.frame;
			sample._offset = audioTrack._mdatSize;
			sample.size = sample._data.byteLength;
			audioTrack._mdatSize += sample.size;

			//dbp('audiosample', pkt.dts, pkt.frame.byteLength);

			if (audioTrack.baseMediaDecodeTime === undefined) {
				audioTrack.baseMediaDecodeTime = (pkt.dts+timeStart)*mp4mux.timeScale;
			}
			sample._dts = pkt.dts*mp4mux.timeScale;

			if (lastSample) {
				lastSample.duration = sample._dts-lastSample._dts;
				lastDuration = lastSample.duration;
			}
			lastSample = sample;
			audioTrack.samples.push(sample);
		});
		//lastSample.duration = lastDuration;

		if (0) {
			let sumup = x => x.samples.reduce((val,e) => val+e.duration, 0);
			dbp('audio.samplesCount',audioTrack.samples.length);
			dbp('video.samplesCount',videoTrack.samples.length);
			dbp('video.duration:', sumup(videoTrack)/mp4mux.timeScale);
			dbp('audio.duration:', sumup(audioTrack)/mp4mux.timeScale);
			dbp('video.baseMediaDecodeTime:', videoTrack.baseMediaDecodeTime/mp4mux.timeScale)
			dbp('audio.baseMediaDecodeTime:', audioTrack.baseMediaDecodeTime/mp4mux.timeScale)
		}

		let moof, _mdat, mdat;
		let list = [];

		moof = mp4mux.moof(0, [videoTrack]);
		_mdat = new Uint8Array(videoTrack._mdatSize);
		videoTrack.samples.forEach(sample => _mdat.set(sample._data, sample._offset));
		mdat = mp4mux.mdat(_mdat);
		list = list.concat([moof, mdat]);

		moof = mp4mux.moof(0, [audioTrack]);
		_mdat = new Uint8Array(audioTrack._mdatSize);
		audioTrack.samples.forEach(sample => _mdat.set(sample._data, sample._offset));
		mdat = mp4mux.mdat(_mdat);
		list = list.concat([moof, mdat]);

		return {buf:concatUint8Array(list), duration:segpkts[segpkts.length-1].dts-segpkts[0].dts};
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

function triggerPerNr(fn, nr) {
	let counter = 0;
	return () => {
		counter++;
		if (counter == nr) {
			counter = 0;
			fn();
		}
	}
}

app.bindVideo = (opts) => {
	let video = opts.video;
	let streams = new Streams({urls:opts.src, fakeDuration:opts.duration});

	let mediaSource = new MediaSource();

	let sourceBuffer;
	let appendBuffer, removeBuffer, dequeAction;
	{
		let queue = [];
		let enque = fn => {
			if (!sourceBuffer.updating)
				fn();
			else
				queue.push(fn);
		}
		appendBuffer = buf => enque(() => sourceBuffer.appendBuffer(buf));
		removeBuffer = (start,end) => enque(() => sourceBuffer.remove(start,end));
		dequeAction = () => {
			if (queue.length > 0) {
				queue[0]();
				queue = queue.slice(1);
			}
		}
	}

	// updateend: if currentTime not buffered set to nearby buffered start
	// seeking: if currentTime nearest keyframe not buffered load media segment else set to it

	video.src = URL.createObjectURL(mediaSource);

	let prefetchSession = null;
	let prefetchMediaSegmentsByTime = (time, len=10) => {
		if (prefetchSession)
			prefetchSession.cancel();
		let sess = streams.fetchMediaSegmentsByTime(time, time+len);
		sess.then(buf => {
			if (buf) {
				appendBuffer(buf)
			} else {
				dbp('prefetch: cancelled')
			}
			if (sess === prefetchSession)
				prefetchSession = null;
		});
		prefetchSession = sess;
	}

	let timeIsBuffered = time => {
		let buffered = sourceBuffer.buffered;
		for (let i = 0; i < buffered.length; i++) {
			if (time >= buffered.start(i) && time < buffered.end(i)) {
				return true;
			}
		}
	}

	video.addEventListener('timeupdate', triggerPerNr(() => {
		let buffered = sourceBuffer.buffered;
		if (buffered.length == 0)
			return;

		let time = video.currentTime + 60.0;
		if (!timeIsBuffered(time) && !prefetchSession) {
			let start = buffered.end(buffered.length-1);
			prefetchMediaSegmentsByTime(start);
		}

		if (buffered.end(0) - buffered.start(0) > 120.0) {
			let keep = 10.0;
			if (video.currentTime > keep) 
				removeBuffer(0, video.currentTime-keep);
		}
	}, 6));

	let needPrefetchTime = null;

	streams.onProbeDone = () => {
		if (needPrefetchTime !== null) {
			dbp('probedone:', 'prefetch')
			prefetchMediaSegmentsByTime(needPrefetchTime);
			needPrefetchTime = null;
		}
	}

	video.addEventListener('seeking', debounce((e) => {
		dbp('seeking:', video.currentTime)

		if (video.currentTime > streams.duration) {
			dbp('seeking:', 'wait probe done');
			removeBuffer(0, video.duration);
			needPrefetchTime = video.currentTime;
			return;
		}

		if (!timeIsBuffered(video.currentTime)) {
			dbp('seeking:', 'need prefetch');
			removeBuffer(0, video.duration);
			prefetchMediaSegmentsByTime(video.currentTime);
		}
	}, 200))

	mediaSource.addEventListener('sourceended', () => dbp('mediaSource: sourceended'))
	mediaSource.addEventListener('sourceclose', () => dbp('mediaSource: sourceclose'))

	mediaSource.addEventListener('sourceopen', e => {
		if (mediaSource.sourceBuffers.length > 0)
			return;
		sourceBuffer = mediaSource.addSourceBuffer('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');

		sourceBuffer.addEventListener('error', () => dbp('sourceBuffer: error'));
		sourceBuffer.addEventListener('abort', () => dbp('sourceBuffer: abort'));
		//sourceBuffer.addEventListener('updateend', () => dbp('sourceBuffer: updateend'));

		sourceBuffer.addEventListener('update', () => {
			dequeAction();

			let ranges = [];
			let buffered = sourceBuffer.buffered;
			for (let i = 0; i < buffered.length; i++) {
				ranges.push([buffered.start(i), buffered.end(i)]);
			}
			dbp('bufupdate:', JSON.stringify(ranges), 'time', video.currentTime);
			
			if (buffered.length > 0) {
				if (video.currentTime < buffered.start(0)) {
					video.currentTime = buffered.start(0)+0.1;
				} else if (video.currentTime > buffered.end(buffered.length-1)) {
					video.currentTime = buffered.end(buffered.length-1)-0.1;
				}
			}
		});

		streams.probeFirst().then(() => {
			appendBuffer(streams.getInitSegment());
			prefetchMediaSegmentsByTime(0, 6);
		});
	});

	return {streams};
}

app.Streams = Streams;
module.exports = app;

