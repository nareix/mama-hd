
// TODO
// [OK] youku support
// [OK] tudou support
// [OK] avoid twice click
// [OK] video player shortcut
// replace fetch with ajax when get media segments
// double buffered problem: http://www.bilibili.com/video/av4376362/index_3.html at 360.0s
// test reset INIT_SEGMENT to reset time
// discontinous audio problem: http://www.bilibili.com/video/av3067286/ at 97.806,108.19
// fast start

let flvMediaSource = require('./flvMediaSource');
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

flvMediaSource.debug = true;

let getSeeker = url => {
	let seekers = [bilibili, youku, tudou];
	let found = seekers.filter(s => s.testUrl(url));
	return found[0];
}

let playUrl = url => {
	let seeker = getSeeker(url)
	if (seeker) {
		flashBlocker();
		nanobar.go(30);
		seeker.getVideos(url).then(res => {
			if (res) {
				let player = createPlayer();
				nanobar.go(60)
				player.onStarted = () => nanobar.go(100);
				player.streams = flvMediaSource.bindVideo(player, res.src);
			} else {
				throw new Error('cannot play')
			}
		}).catch(e => {
			nanobar.go(100);
		});
	}
}

let cmd = {};

cmd.testPlayerUI = () => {
	let player = createPlayer();
	player.streams = flvMediaSource.bindVideo(player.video, ['http://localhost:6060/projectindex-2.flv']);
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

if (!window.mamaloaded) {
	playUrl(location.href);
	window.mamaloaded = true;
}

window.cmd = cmd;

