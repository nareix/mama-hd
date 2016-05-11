
// TODO
// [OK] youku support
// [OK] tudou support
// [OK] video player shortcut
// [OK] double buffered problem: http://www.bilibili.com/video/av4376362/index_3.html at 360.0s
//      discontinous audio problem: http://www.bilibili.com/video/av3067286/ at 97.806,108.19
//      discontinous audio problem: http://www.bilibili.com/video/av1965365/index_6.html at 51.806
// [OK] fast start
// [OK] open twice
// [OK] http://www.bilibili.com/video/av3659561/index_57.html: Error: empty range, maybe video end
// [OK] http://www.bilibili.com/video/av3659561/index_56.html: First segment too small
// [OK] double buffered problem: http://www.bilibili.com/video/av4467810/
// [OK] double buffered problem: http://www.bilibili.com/video/av3791945/ 
// 	   [[2122.957988,2162.946522],[2163.041988,2173.216033]]
// [OK] video reset problem: http://www.bilibili.com/video/av314/
// [OK] video stuck problem: http://www.tudou.com/albumplay/-3O0GyT_JkQ/Az5cnjgva4k.html 16:11
// [OK] InitSegment invalid: http://www.bilibili.com/video/av1753789 
// EOF error at index 67 http://www.bilibili.com/video/av4593775/

// Test needed for safari: 
//    xhr cross origin, change referer header, pass arraybuffer efficiency,
//    mse playing

'use strict'

let localhost = 'http://localhost:6060/'

let mediaSource = require('./mediaSource');
let Nanobar = require('nanobar');
let bilibili = require('./bilibili');
let youku = require('./youku');
let tudou = require('./tudou');
let createPlayer = require('./player');
let flashBlocker = require('./flashBlocker');
let flvdemux = require('./flvdemux');
let Damoo = require('./damoo');

let nanobar = new Nanobar();

let style = document.createElement('style');
style.innerHTML = `
.nanobar .bar {
	background: #c16c70;
}
.nanobar {
	z-index: 2999999;
	left: 0px;
	top: 0px;
}
`
document.head.appendChild(style);
mediaSource.debug = true;

let getSeeker = url => {
	let seekers = [bilibili, youku, tudou];
	let found = seekers.filter(s => s.testUrl(url));
	return found[0];
}

let playVideo = res => {
	let player = createPlayer();
	let media = mediaSource.bindVideo({
		video:player.video,
		src:res.src,
		duration:res.duration,
	});
	player.streams = media.streams;
	return {player, media};
}

let handleDamoo = (vres, player, seeker, media) => {
	let mode;
	if (seeker.getAllDamoo) {
		mode = 'all';
	} else if (seeker.getDamooProgressive) {
		mode = 'progressive';
	}

	if (!mode)
		return;

	let damoos = [];

	(() => {
		if (mode == 'all') {
			return seeker.getAllDamoo(vres).then(res => {
				damoos = res;
			});
		} else if (mode == 'progressive') {
			return new Promise((fulfill, reject) => {
				seeker.getDamooProgressive(vres, res => {
					damoos = damoos.concat(res);
					//console.log(`damoo: loaded n=${damoos.length}`);
					fulfill();
				})
			});
		}
	})().then(() => {
		//console.log(`damoo: loaded n=${damoos.length}`);

		let video = player.video;
		let updating;
		let cur = 0;

		let update = () => {
			let time = video.currentTime+1.0;
			if (cur < damoos.length && time > damoos[cur].time) {
				for (; cur < damoos.length && damoos[cur].time <= time; cur++) {
					let d = damoos[cur];
					console.log('damoo: emit', `${Math.floor(d.time/60)}:${Math.floor(d.time%60)}`, d.text);
					//emitter.emit({text: d.text, shadow: true, color: d.color});
				}
			}
			updating = setTimeout(update, 1000);
		};
		let stopUpdate = () => {
			if (updating) {
				clearTimeout(updating);
				updating = null;
			}
		}
		let startUpdate = () => {
			if (!updating)
				update();
		}

		let resetCur = () => {
			let time;
			for (cur = 0; cur < damoos.length; cur++) {
				if (damoos[cur].time > video.currentTime) {
					time = damoos[cur].time;
					break;
				}
			}
			console.log(`damoo: cur=${cur}/${damoos.length} time=${time}`);
		}

		media.onSeek.push(() => {
			//console.log('damoo: clear');
			// emitter.clear();
			resetCur();
		})

		player.onResume.push(() => {
			// emitter.resume()
			startUpdate();
		});
		player.onSuspend.push(() => {
			// emitter.suspend()
			stopUpdate();
		});

	});
}

let playUrl = url => {
	return new Promise((fulfill, reject) => {
		let seeker = getSeeker(url)
		if (seeker) {
			flashBlocker();
			nanobar.go(30);
			seeker.getVideos(url).then(res => {
				console.log('getVideosResult:', res);
				if (res) {
					let ctrl = playVideo(res);
					ctrl.player.onStarted.push(() => nanobar.go(100));
					handleDamoo(res, ctrl.player, seeker, ctrl.media);
					nanobar.go(60)
					fulfill(ctrl);
				} else {
					throw new Error('getVideosResult: invalid')
				}
			}).catch(e => {
				nanobar.go(100);
				throw e;
			});
		} else {
			throw new Error('seeker not found');
		}
	});
}

let cmd = {};

cmd.youku = youku;
cmd.tudou = tudou;
cmd.bilibili = bilibili;

cmd.testDanmuLayer = () => {
	let danmu = createDamnuLayer(document.body);
}

cmd.fetchSingleFlvMediaSegments = (url, duration, indexStart, indexEnd) => {
	let streams = new mediaSource.Streams({
		urls: [localhost+url],
		fakeDuration: duration,
	});
	streams.onProbeProgress = (stream, i) => {
		if (i == 0) {
			streams.fetchMediaSegmentsByIndex(indexStart, indexEnd);
		}
	};
	streams.probeOneByOne();
}

cmd.playSingleFlv = (url, duration, pos) => {
	cmd.ctrl = playVideo({
		src:[
			localhost+url,
		],
		duration,
	});
	if (pos) 
		setTimeout(() => cmd.ctrl.player.video.currentTime = pos, 500);
}

cmd.getVideos = url => {
	let seeker = getSeeker(url);
	if (!seeker) {
		console.log('seeker not found');
		return;
	}
	seeker.getVideos(url).then(res => console.log(res))
}

cmd.playUrl = playUrl;

cmd.testXhr = () => {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', localhost+'projectindex-0.flv');
	setTimeout(() => xhr.abort(), 100);
	xhr.onload = function(e) {
		console.log(this.status);
		console.log(this.response.length);
	}
	xhr.onerror = function() {
		console.log('onerror')
	}
	xhr.send();
}

cmd.testWriteFile = () => {
	let errfunc = e => console.error(e);
	webkitRequestFileSystem(TEMPORARY, 1*1024*1024*1024, fs => {
		fs.root.getFile('tmp.bin', {create:true}, file => {
			file.createWriter(writer => {
				writer.onwrittend = () => console.log('write complete');
				//writer.truncate(1024*1024);
				for (let i = 0; i < 1024*1024*10; i++) {
					let u8 = new Uint8Array([0x65,0x65,0x65,0x65]);
					writer.write(new Blob([u8]));
				}
				let a = document.createElement('a');
				a.href = file.toURL();
				a.download = 'a.txt';
				document.body.appendChild(a);
				a.click();
			});
		}, errfunc);
	}, errfunc);
}

cmd.testfetch = () => {
	let dbp = console.log.bind(console)

	let parser = new flvdemux.InitSegmentParser();
	let total = 0;
	let pump = reader => {
		return reader.read().then(res => {
			if (res.done) {
				dbp('parser: EOF');
				return;
			}
			let chunk = res.value;
			total += chunk.byteLength;
			dbp(`parser: incoming ${chunk.byteLength}`);
			let done = parser.push(chunk);
			if (done) {
				dbp('parser: finished', done);
				reader.cancel();
				return done;
			} else {
				return pump(reader);
			}
		});
	}

	let headers = new Headers();
	headers.append('Range', 'bytes=0-400000');
	fetch(`http://27.221.48.172/youku/65723A1CDA44683D499698466F/030001290051222DE95D6C055EEB3EBFDE3F09-E65E-1E0A-218C-3CDFACC4F973.flv`, {headers}).then(res => pump(res.body.getReader()))
		.then(res => console.log(res));
}

cmd.testInitSegment = () => {
	let dbp = console.log.bind(console)

	let meta;
	let fetchseg = seg => {
		return fetch(localhost+'test-fragmented.mp4', {headers: {
			Range: `bytes=${seg.offset}-${seg.offset+seg.size-1}`,
		}}).then(res=>res.arrayBuffer());
	}

	fetch(localhost+'test-fragmented-manifest.json').then(res=>res.json()).then(res => {
		meta = res;
		dbp('meta', meta);
	}).then(res => {
		res = new Uint8Array(res);

		let mediaSource = new MediaSource();
		let video = document.createElement('video');
		document.body.appendChild(video);

		video.src = URL.createObjectURL(mediaSource);
		video.autoplay = true;

		video.addEventListener('loadedmetadata', () => {
			dbp('loadedmetadata', video.duration);
		});

		let sourceBuffer;
		mediaSource.addEventListener('sourceopen', e => {
			dbp('sourceopen');
			if (mediaSource.sourceBuffers.length > 0)
				return;
			let codecType = meta.type;
			sourceBuffer = mediaSource.addSourceBuffer(codecType);
			sourceBuffer.mode = 'sequence';
			sourceBuffer.addEventListener('error', () => dbp('sourceBuffer: error'));
			sourceBuffer.addEventListener('abort', () => dbp('sourceBuffer: abort'));
			sourceBuffer.addEventListener('update', () => {
				dbp('sourceBuffer: update');
			})
			sourceBuffer.addEventListener('updateend', () => {
				let ranges = [];
				let buffered = sourceBuffer.buffered;
				for (let i = 0; i < buffered.length; i++) {
					ranges.push([buffered.start(i), buffered.end(i)]);
				}
				dbp('sourceBuffer: updateend');
				dbp('buffered', JSON.stringify(ranges), 'duration', video.duration);
			});
			fetchseg(meta.init).then(() => {
				sourceBuffer.appendBuffer(res);
				return fetchseg(meta.media[1]).then(res => {
					dbp(res.byteLength);
					sourceBuffer.appendBuffer(res);
				});
			});
		})
		mediaSource.addEventListener('sourceended', () => dbp('mediaSource: sourceended'))
		mediaSource.addEventListener('sourceclose', () => dbp('mediaSource: sourceclose'))
	}).catch(e => {
		console.error(e);
	});
}

cmd.testDamoo = () => {
	let div = document.createElement('div');

	div.innerHTML = `
		<h1>Background</h1>
	`;
	div.style.height = '100%';
	div.style.width = '100%';
	div.style.background = '#eee';

	document.body.appendChild(div);

	let dm = new Damoo(div, 'test', 20);
	dm.start();

	dm.emit({text:'小小小的文字', color:'#000'});
	dm.emit({text:'小小小的文字', color:'#000', fixed:true});
	dm.emit({text:'稍微长一点的文字2333333333333333333', color:'#000', fixed:true});

	let i = 0;
	let timer = setInterval(() => {
		i++;
		if (i > 300) {
			clearInterval(timer);
			return;
		}
		let text = '哔哩哔哩';
		for (let i = 0; i < 4; i++)
			text = text+text;
		dm.emit({
			text,
			color: '#f00', 
			shadow: true,
		});
	}, 100);
}

if (location.href.substr(0,6) != 'chrome') {
	playUrl(location.href);
} else {
	window.cmd = cmd;
}

