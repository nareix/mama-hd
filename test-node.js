
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

app.fetchAB = (url, _opts) => {
	var buf = fs.readFileSync(path.join(avtest, url));
	let start, end;

	let opts = {};
	if (_opts.start || _opts.end) {
		if (_opts.start)
			start = _opts.start;
		else
			start = 0;
		if (_opts.end)
			end = _opts.end;
		else
			end = buf.length;
	}
	var rangebuf = toArrayBuffer(buf).slice(start, end);
	return Promise.resolve(rangebuf);
}

if (1) {
	let urls = [];
	for (let i = 0; i < 4; i++)
		urls.push('projectindex-'+i+'.flv');
	let streams = new app.Streams(urls);

	streams.probe().then(() => {
		console.log('probe done', streams.duration/60.)
		let start = streams.streams[1].timeStart;
		return streams.fetchMediaSegments(start-10, start+10).then(buf => {
			let initSeg = new Buffer(streams.getInitSegment());
			buf = new Buffer(buf);
			fs.writeFileSync('out.mp4', Buffer.concat([initSeg, buf]));
			console.log('write done');
		})
	}).catch(e => {
		console.error(e.stack)
	})
}


