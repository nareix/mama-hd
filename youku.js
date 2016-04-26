/*  youku 
 *  @朱一
 */

'use strict'

var querystring = require('querystring');

exports.testUrl = function (url) {
  return url.match(/v\.youku\.com/)
}

function E(a, c) {
	for (var b = [], f = 0, i, e = "", h = 0; 256 > h; h++) b[h] = h;
	for (h = 0; 256 > h; h++) f = (f + b[h] + a.charCodeAt(h % a.length)) % 256, i = b[h], b[h] = b[f], b[f] = i;
	for (var q = f = h = 0; q < c.length; q++) h = (h + 1) % 256, f = (f + b[h]) % 256, i = b[h], b[h] = b[f], b[f] = i, e += String.fromCharCode(c.charCodeAt(q) ^ b[(b[h] + b[f]) % 256]);
	return e
}

function generate_ep(no,streamfileid,sid,token) {
	var number = no.toString(16).toUpperCase();
	if (number.length == 1) {
		number = '0'+number;
	}
	var fcode2 = 'bf7e5f01';
	var fileid = streamfileid.slice(0,8)+number+streamfileid.slice(10);
	var ep = encodeURIComponent(btoa(E(fcode2, sid+'_'+fileid+'_'+token)));
	return [fileid, ep];
}

exports.testEncryptFuncs = function() {
	{
		let fn = (a,b) => E(a, atob(b)).split('_')
		console.log(fn("becaf9be","PgXWTwkWLrPa2fbJ9+JxWtGhuBQ01wnKWRs="),"9461488808682128ae179_4114")
	}

	{
		let assert = (r1, r2) => {
			console.log(r1[0]==r2[0],r1[1]==r2[1]);
		}
		assert(generate_ep(0,"03008002005715DFD766A500E68D4783E81E57-3E8D-DABF-8542-460ADBBC66A5","24614839104951215057d","1329"),["03008002005715DFD766A500E68D4783E81E57-3E8D-DABF-8542-460ADBBC66A5","cCaSG02FVccB5SfWjT8bZinicXBbXP4J9h%2BNgdJgALshT%2Bm67UilwJu2P%2FpCFowfelYCF%2BPy3tjmH0UTYfM2oRwQqz%2FaT%2Fro%2B%2FTh5alVxOF0FGtFdMumsVSfQDL4"])
	}

	{
		console.log(querystring.parse("oip=1932302622&ep=cCaSG02FX84D5ifaij8bbn7jd3VZXP4J9h%2BNgdJgALshT%2Bm67UilwJu2P%2FpCFowfelYCF%2BPy3tjmH0UTYfM2oRwQqz%2FaT%2Fro%2B%2FTh5alVxOF0FGtFdMumsVSfQDH1&token=1314&yxon=1&ctype=12&ev=1&K=9f73bb3c4155957624129573"))
		console.log('mine',querystring.parse("ctype=12&ev=1&K=fb5cd30b897d0949261ef913&ep=cSaSG02FUcoC5yfZij8bZH%2FjIHMLXP4J9h%2BNgdJhALshT%2BnNnzrSxJXFS41CFv5oBid1Y5rzrNSTY0ARYfU2qG4Q2kqtSPrni4Ti5apWzZMAFxk2AMnTxVSaRDP3&oip=1932302622&token=4736&yxon=1"))
	}
}

var extractFlvPath = exports.extractFlvPath = function(info) {
	var sorted = info.data10.stream.sort(
			(a,b) => a.height<b.height||a.height==b.height&&a.milliseconds_audio<b.milliseconds_audio);
	var stream = sorted[0];

	var ep = info.data12.security.encrypt_string;
	var ip = info.data12.security.ip;

	var f_code_1 = 'becaf9be';
	var eres = E(f_code_1, atob(ep)).split('_');
	var sid = eres[0];
	var token = eres[1];

	var urls = stream.segs.map((seg, no) => {
		var gres = generate_ep(no, stream.stream_fileid, sid, token);
		var fileid = gres[0];
		var fileep = gres[1];
		var q = querystring.stringify({ctype:12, ev:1, K:seg.key, ep:decodeURIComponent(fileep), oip:ip, token, yxon:1});
		var container = {
			mp4hd3:'flv', hd3:'flv', mp4hd2:'flv',
			hd2:'flv', mp4hd:'mp4', mp4:'mp4',
			flvhd:'flv', flv:'flv', '3gphd':'3gp',
		}[stream.stream_type];
		var url = `http://k.youku.com/player/getFlvPath/sid/${sid}_00/st/${container}/fileid/${fileid}?${q}`;
		return url;
	});

	return Promise.all(urls.map(url => fetch(url).then(res => res.json()).then(r => r[0].server)))
		.then(urls => {
			return {src: urls, duration: stream.milliseconds_video/1000.0};
		});
}

var getVideosByVideoId = exports.getVideosByVideoId = function (vid) {
	return Promise.all([
		fetch('http://play.youku.com/play/get.json?vid='+vid+'&ct=10').then(res => res.json()),
		fetch('http://play.youku.com/play/get.json?vid='+vid+'&ct=12').then(res => res.json()),
	]).then(res => {
		var data10 = res[0].data;
		var data12 = res[1].data;
		return extractFlvPath({data10,data12});
	})
}

var getVideosByVcode = exports.getVideosByVcode = function (vcode) {
	return getVideosByUrl(`http://v.youku.com/v_show/id_${vcode}.html`);
}

var getVideosByUrl = exports.getVideosByUrl = function (url) {
	return fetch(url, {credentials: 'include'}).then(res => res.text()).then(res => {
		var parser = new DOMParser();
		var doc = parser.parseFromString(res, 'text/html');
		var scripts = Array.prototype.slice.call(doc.querySelectorAll('script')).map(script => script.textContent);
		var videoId = scripts.filter(x => x.match(/var videoId =/));
		if (videoId) {
			videoId = videoId[0].match(/videoId = '(\d+)'/);
			if (videoId)
				return getVideosByVideoId(videoId[1]);
		}
	})
}

exports.getVideos = function (url) {
	if (window.videoId)
		return getVideosByVideoId(window.videoId);
	else 
		return getVideosByUrl(url);
}

