
'use strict' 

let app = require('./app.js');
let mp4mux = require('./mp4-generator.js');
let flvdemux = require('./flv-parser.js');
let fs = require('fs');
let path = require('path');
let hexy = require('hexy');

function toArrayBuffer(buffer) {
	var ab = new ArrayBuffer(buffer.length);
	var view = new Uint8Array(ab);
	for (var i = 0; i < buffer.length; ++i) {
		view[i] = buffer[i];
	}
	return ab;
}

let avtest = '/Users/xb/src/avtest/';
let readFlvRange = (start,end) => {
	return new Uint8Array(toArrayBuffer(fs.readFileSync(path.join(avtest, 'mofa.flv')))).slice(start, end);
}

let mofabuf = readFlvRange(0, 1024*100);
let flvhdr = flvdemux.parseInitSegment(mofabuf);
let keyframes = flvhdr.meta.keyframes;

if (0) {
	let ctss = flvsegs.filter(pkt => {
		return pkt.type == 'video'
	}).map(pkt => {return {cts:pkt.cts, dts:pkt.dts}});
	console.log(ctss)
}

if (0) {
	let firstVideoPkt;
	flvsegs.forEach(pkt => {
		if (pkt.type == 'video' && pkt.NALUs)
			firstVideoPkt = pkt;
	})
	console.log(hexy.hexy(new Buffer(firstVideoPkt.NALUs), {format:'twos'}))
}

//let avcC = new Uint8Array(toArrayBuffer(fs.readFileSync(path.join(avtest, 'frag_bunny_avcC'))));

if (1) {
	let segbuf = readFlvRange(keyframes.filepositions[9], keyframes.filepositions[12]);
	let r = app.testmux(flvhdr, segbuf);
	let file = r.file;
	let samples = r.audioTrack.samples;
	console.log(flvhdr.meta.framerate)

	fs.writeFileSync('out.mp4', new Buffer(file));
}

