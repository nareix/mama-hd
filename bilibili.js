
var md5 = require('blueimp-md5');
const SECRETKEY_MINILOADER = '1c15888dc316e05a15fdd0a02ed6584f';
let interfaceUrl = (cid, ts) => `cid=${cid}&player=1&ts=${ts}`;
let calcSign = (cid, ts) => md5(`${interfaceUrl(cid,ts)}${SECRETKEY_MINILOADER}`);

exports.calcSign = calcSign;
exports.testUrl = url => url.match('bilibili.com/')

exports.getVideos = (url) => {
	return fetch(url, {credentials: 'include'}).then(res => res.text()).then(res => {
		let cid = res.match(/cid=(\d+)/);
		if (cid)
			return cid[1];
	}).then(function(cid) {
		if (!cid)
			return;

		let ts = Math.ceil(Date.now()/1000)
		return fetch(`http://interface.bilibili.com/playurl?${interfaceUrl(cid,ts)}&sign=${calcSign(cid,ts)}`)
		.then(res => res.text()).then(res => {
			let parser = new DOMParser();
			let doc = parser.parseFromString(res, 'text/xml');
			let array = x => Array.prototype.slice.call(x);
			let duration = 0.0;
			array(doc.querySelectorAll('durl > length')).forEach(len => duration += +len.textContent);
			let src = array(doc.querySelectorAll('durl > url')).map(url => url.textContent );
			return {
				duration: duration/1000.0,
				src: src,
				commentUrl: 'http://comment.bilibili.com/'+cid+'.xml',
			}
		})
	});
}

function pad(num, n) { 
	if (num.length >= n)
		return num;
	return (Array(n).join(0) + num).slice(-n)
}
let colorDec2Hex = (x) => '#'+pad((x||0).toString(16), 6)
exports.colorDec2Hex = colorDec2Hex;

let getDamooRaw = url => {
	return fetch(url).then(res => res.text()).then(res => {
		let parser = new DOMParser();
		let doc = parser.parseFromString(res, 'text/xml');
		let array = x => Array.prototype.slice.call(x);
		return array(doc.querySelectorAll('i > d')).map((d, i) => {
			let p = d.getAttribute('p').split(',');
			if (p[5] == 2)
				return;
			let pos;
			switch (+p[1]) {
				case 4: pos = 'bottom'; break;
				case 5: pos = 'top'; break;
			}
			//console.log(p[1], d.textContent);
			return {time: parseFloat(p[0]), pos, color:colorDec2Hex(+p[3]), text: d.textContent};
		}).filter(x => x).sort((a,b) => a.time-b.time);
		return arr;
	})
}
exports.getDamooRaw = getDamooRaw;

exports.getAllDamoo = (res) => {
	return getDamooRaw(res.commentUrl);
}

