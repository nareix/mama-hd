
// TODO
// [OK] youku support
// [OK] tudou support
// [OK] video player shortcut
// [OK] double buffered problem: http://www.bilibili.com/video/av4376362/index_3.html at 360.0s
//      discontinous audio problem: http://www.bilibili.com/video/av3067286/ at 97.806,108.19
//      discontinous audio problem: http://www.bilibili.com/video/av1965365/index_6.html at 51.806
// fast start

let mediaSource = require('./mediaSource');
let Nanobar = require('nanobar');
let bilibili = require('./bilibili');
let youku = require('./youku');
let tudou = require('./tudou');
let createPlayer = require('./player');
let flashBlocker = require('./flashBlocker');

let nanobar = new Nanobar();

let style = document.createElement('style');
style.innerHTML = `
.nanobar .bar {
	background: #c16c70
}
.nanobar {
	z-index: 2999999
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

let playUrl = url => {
	let seeker = getSeeker(url)
	if (seeker) {
		flashBlocker();
		nanobar.go(30);
		seeker.getVideos(url).then(res => {
			console.log('getVideosResult:', res);
			if (res) {
				let ctrl = playVideo(res);
				ctrl.player.onStarted = () => nanobar.go(100);
				nanobar.go(60)
			} else {
				throw new Error('cannot play')
			}
		}).catch(e => {
			console.error(e.stack)
			nanobar.go(100);
		});
	}
}

let cmd = {};

cmd.testBuggy2Buf = () => {
	let streams = new mediaSource.Streams(['http://localhost:6060/buggybuf2.flv']);
	streams.probe().then(res => {
		return streams.fetchMediaSegmentsByIndex(74, 77).then(res => {
		});
	}).then(res => {
	})
}

cmd.testBuggy2Play = () => {
	cmd.ctrl = playVideo({
		src:[
			'http://localhost:6060/buggybuf2.flv',
		],
	});
	setTimeout(() => cmd.ctrl.player.video.currentTime = 350.0, 500);
}

cmd.fetchDiscontAudio = () => {
	// at 209.667
	let streams = new mediaSource.Streams(['http://localhost:6060/discontaudio.flv']);
	streams.probe().then(res => {
		return streams.fetchMediaSegmentsByIndex(40,41);
	}).then(() => {
		return streams.fetchMediaSegmentsByIndex(41,42);
	})
}
cmd.fetchDiscontAudio()

cmd.playDiscontAudio = () => {
	cmd.ctrl = playVideo({
		src:[
			'http://localhost:6060/discontaudio.flv',
		],
	});
	setTimeout(() => cmd.ctrl.player.video.currentTime = 51.0, 400);
}

cmd.testPlayerUI = () => {
	cmd.ctrl = playVideo({
		src:[
			'http://localhost:6060/projectindex-0.flv',
			'http://localhost:6060/projectindex-1.flv',
			'http://localhost:6060/projectindex-2.flv',
			'http://localhost:6060/projectindex-3.flv',
		],
		duration: 1420.0,
	});
}

cmd.youku = youku;

cmd.testGetVideos = url => {
	let seeker = getSeeker(url);
	if (!seeker) {
		console.log('seeker not found');
		return;
	}
	seeker.getVideos(url).then(res => console.log(res))
}

cmd.testYouku = () => {
	youku.getVideos('http://v.youku.com/v_show/id_XMTU0NTYzOTIyMA==.html?from=1-1').then(res => console.log(res))
	//youku.testEncryptFuncs()
	//youku.showlog()
}

cmd.playUrl = url => {
	playUrl(url)
}

playUrl(location.href);

window.cmd = cmd;

