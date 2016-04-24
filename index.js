
// BUGGY video: http://www.bilibili.com/video/av4376362/index_3.html at 360.0s

let flvMediaSource = require('./flvMediaSource');
let Nanobar = require('nanobar');
let bilibili = require('./bilibili');
let youku = require('./youku');
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
	let seekers = [bilibili, youku];
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
				nanobar = Nanobar();
				nanobar.go(60)
				player.onStarted = () => nanobar.go(100);
				flvMediaSource.bindVideo(player.video, res.src);
			}
		});
	}
}

let cmd = {};

cmd.testPlayerUI = () => {
	let player = createPlayer();
	flvMediaSource.bindVideo(player.video, ['http://localhost:8080/projectindex-0.flv']);
}

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
	youku.testEncryptFuncs()
}

cmd.playUrl = url => {
	playUrl(url)
}

playUrl(location.href);

window.cmd = cmd;

