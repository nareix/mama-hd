/*  tudou 
 *  @朱一
 */
// TODO:
// cannot play http://www.tudou.com/programs/view/TXBFQYX6F04/ missing vcode

var youku = require('./youku')
var bilibili = require('./bilibili')
var querystring = require('querystring');

exports.testUrl = function (url) {
  return /tudou\.com/.test(url);
}

exports.getVideos = function (url) {  
	return (() => {
		if (window.pageConfig && window.pageConfig.vcode && window.pageConfig.iid) {
			return Promise.resolve({vcode: window.pageConfig.vcode, iid: window.pageConfig.iid});
		}
		return fetch(url, {credentials: 'include'}).then(res => res.text()).then(res => {
			var vcode = res.match(/vcode: '(\S+)'/);
			var iid = res.match(/iid: (\S+)/);
			if (vcode && iid) 
				return {vcode:vcode[1], iid:iid[1]};
		})
	})().then(res => {
		if (res == null)
			throw new Error('vcode iid not found');
		return youku.getVideosByVcode(res.vcode).then(yres => {
			yres.iid = res.iid;
			return yres;
		});
	})
}

let getDamooRaw = (id, params) => {
	//http://service.danmu.tudou.com/list?7122
	//FormData: uid=81677981&mcount=1&iid=132611501&type=1&ct=1001&mat=6
	//mat=minute at
	params.uid = params.uid || 0;
	params.mcount = params.mcount || 5;
	params.type = params.type || 1;
	params.ct = params.ct || 1001;
	var body = querystring.stringify(params);
	return fetch('http://service.danmu.tudou.com/list?'+id, {
		credentials: 'include', body, method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	}).then(res => res.json()).then(res => {
		if (!(res && res.result))
			return;
		return res.result.map((x, i) => {
			let color;
			let pos;
			if (x.propertis) {
				try {
					let p = JSON.parse(x.propertis);
					color = bilibili.colorDec2Hex(p.color);
					if (color.length > 7)
						color = color.substr(0, 7);
					switch (p.pos) {
					case 6: pos = 'bottom'; break;
					case 4: pos = 'top'; break;
					}
				} catch (e) {
				}
			}
			return {
				text: x.content,
				time: x.playat/1000.0,
				color, pos,
			}
		}).sort((a,b) => a.time-b.time)
	});
}
exports.getDamooRaw = getDamooRaw;

exports.getDamooProgressive = (vres, cb) => {
	let get = minute => {
		let n = 1;
		getDamooRaw(1234, {iid: vres.iid, mat: minute, mcount: n}).then(res => {
			if (res && res.length > 0) {
				//console.log(`tudou: damoo loaded minute=[${minute},${minute+n}] n=${res.length}`);
				cb(res);
			}
			if (minute*60 < vres.duration)
				get(minute+n);
		});
	}
	get(0);
}

