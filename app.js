
'use strict'

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

var app = {};

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
			return app.fetchU8(url, {end:1024*400}).then(u8 => {
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

app.Streams = Streams;

app.fetchU8 = (url, opts) => app.fetchAB(url, opts).then(ab => new Uint8Array(ab))

app.testmux = (flvhdr, segbuf) => {
	let start = 4;
	let end = 5;
	let segpkts = flvdemux.parseMediaSegment(segbuf);

	let videoTrack = {
		type: 'video',
		id: 1,
		duration: Math.ceil(flvhdr.meta.duration*mp4mux.timeScale),
		width: flvhdr.meta.width,
		height: flvhdr.meta.height,
		AVCDecoderConfigurationRecord: flvhdr.firstv.AVCDecoderConfigurationRecord,
		samples: [],
		_mdatSize: 0,
	};

	let audioTrack = {
		type: 'audio',
		id: 2,
		duration: videoTrack.duration,
		channelcount: flvhdr.firsta.channelCount,
		samplerate: flvhdr.firsta.sampleRate,
		samplesize: flvhdr.firsta.sampleSize,
		AudioSpecificConfig: flvhdr.firsta.AudioSpecificConfig,
		samples: [],
		_mdatSize: 0,
	};

	let firstDts, lastSample;
	firstDts = segpkts[0].dts;

	let emptySample = {
		duration: 0,
		size: 0,
		compositionTimeOffset: 0,
		flags: {
			isLeading: 0,
			dependsOn: 0,
			isDependedOn: 0,
			hasRedundancy: 0,
			paddingValue: 0,
			isNonSyncSample: 0,
			degradationPriority: 0,
		},
	};

	//videoTrack.samples.push(emptySample);
	segpkts.filter(pkt => pkt.type == 'video' && pkt.NALUs).forEach((pkt, i) => {
		let sample = {};
		sample._data = pkt.NALUs;
		sample._offset = videoTrack._mdatSize;
		sample.size = sample._data.byteLength;
		videoTrack._mdatSize += sample.size;

		sample._dts = (pkt.dts-firstDts)*mp4mux.timeScale;
		sample.compositionTimeOffset = pkt.cts*mp4mux.timeScale;
		sample.flags = {
			isLeading: 0,
			dependsOn: 0,
			isDependedOn: 0,
			hasRedundancy: 0,
			paddingValue: 0,
			isNonSyncSample: i>0?1:0,
			degradationPriority: 0,
		};

		if (lastSample) {
			lastSample.duration = sample._dts-lastSample._dts;
		}
		lastSample = sample;
		videoTrack.samples.push(sample);
	});
	videoTrack.baseMediaDecodeTime = 0;

	//audioTrack.samples.push(emptySample);
	lastSample = null;
	segpkts.filter(pkt => pkt.type == 'audio' && pkt.frame).forEach((pkt, i) => {
		let sample = {};
		sample._data = pkt.frame;
		sample._offset = audioTrack._mdatSize;
		sample.size = sample._data.byteLength;

		audioTrack._mdatSize += sample.size;

		sample._dts = (pkt.dts-firstDts)*mp4mux.timeScale;
		if (lastSample) {
			lastSample.duration = sample._dts-lastSample._dts;
		}
		lastSample = sample;
		audioTrack.samples.push(sample);
	});
	audioTrack.baseMediaDecodeTime = 0;

	let moov = mp4mux.initSegment([videoTrack, audioTrack]);
	let moof, _mdat, mdat;
	let list = [moov];

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

	let file = concatUint8Array(list);

	return {file, audioTrack};
}

try {
	module.exports = app;
	global.app = app;
} catch (e) {
}

