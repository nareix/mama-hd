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

	{
		let data = JSON.parse(`{"e":{"desc":"","provider":"play","code":0},"data":{"id":862768,"stream":[{"logo":"none","media_type":"standard","audio_lang":"default","subtitle_lang":"default","transfer_mode_org":"http","segs":[{"total_milliseconds_audio":"1795669","fileid":"030020010057230223FEB42D9B7D2FB424E317-3B01-8066-DABC-7C9B74ADE438","total_milliseconds_video":"1795667","key":"90e959ebddf813392412979a","size":"86371154"}],"stream_type":"3gphd","width":480,"transfer_mode":"http","size":86371154,"height":366,"milliseconds_video":1795667,"drm_type":"default","milliseconds_audio":1795669,"stream_fileid":"030020010057230223FEB42D9B7D2FB424E317-3B01-8066-DABC-7C9B74ADE438"},{"logo":"none","media_type":"standard","audio_lang":"default","subtitle_lang":"default","transfer_mode_org":"http","segs":[{"total_milliseconds_audio":"409600","fileid":"03000205005723027DFEB42D9B7D2FB424E317-3B01-8066-DABC-7C9B74ADE438","total_milliseconds_video":"409600","key":"37ec34a13b3d665b282b61be","size":"20591540"},{"total_milliseconds_audio":"409600","fileid":"03000205015723027DFEB42D9B7D2FB424E317-3B01-8066-DABC-7C9B74ADE438","total_milliseconds_video":"409600","key":"f6b9ef5afce65a04261efcac","size":"21394445"},{"total_milliseconds_audio":"362533","fileid":"03000205025723027DFEB42D9B7D2FB424E317-3B01-8066-DABC-7C9B74ADE438","total_milliseconds_video":"362533","key":"62e46a284c2d2ae32412979a","size":"19437517"},{"total_milliseconds_audio":"298400","fileid":"03000205035723027DFEB42D9B7D2FB424E317-3B01-8066-DABC-7C9B74ADE438","total_milliseconds_video":"298400","key":"1fa3c8fa48ce0e1f2412979a","size":"19868318"},{"total_milliseconds_audio":"315536","fileid":"03000205045723027DFEB42D9B7D2FB424E317-3B01-8066-DABC-7C9B74ADE438","total_milliseconds_video":"315534","key":"37cdf72dd0e395fe261efcac","size":"20442591"}],"stream_type":"flvhd","width":480,"transfer_mode":"http","size":101734411,"height":366,"milliseconds_video":1795667,"drm_type":"default","milliseconds_audio":1795669,"stream_fileid":"03000205005723027DFEB42D9B7D2FB424E317-3B01-8066-DABC-7C9B74ADE438"},{"logo":"none","media_type":"standard","audio_lang":"default","subtitle_lang":"default","transfer_mode_org":"http","segs":[{"total_milliseconds_audio":"395854","fileid":"030008050057230A77FEB42D9B7D2FB424E317-3B01-8066-DABC-7C9B74ADE438","total_milliseconds_video":"395854","key":"4e534452a6dfd9872412979a","size":"32024089"},{"total_milliseconds_audio":"391349","fileid":"030008050157230A77FEB42D9B7D2FB424E317-3B01-8066-DABC-7C9B74ADE438","total_milliseconds_video":"391349","key":"fb34cda7c5fc5268261efcac","size":"32844767"},{"total_milliseconds_audio":"374584","fileid":"030008050257230A77FEB42D9B7D2FB424E317-3B01-8066-DABC-7C9B74ADE438","total_milliseconds_video":"374583","key":"5a17bba933613284261efcac","size":"33922099"},{"total_milliseconds_audio":"333625","fileid":"030008050357230A77FEB42D9B7D2FB424E317-3B01-8066-DABC-7C9B74ADE438","total_milliseconds_video":"333625","key":"0ba87cd04ff5a9492412979a","size":"37678873"},{"total_milliseconds_audio":"300257","fileid":"030008050457230A77FEB42D9B7D2FB424E317-3B01-8066-DABC-7C9B74ADE438","total_milliseconds_video":"300174","key":"2331c14afeb54948261efcac","size":"35383393"}],"stream_type":"mp4hd","width":704,"transfer_mode":"http","size":171853221,"height":536,"milliseconds_video":1795585,"drm_type":"default","milliseconds_audio":1795669,"stream_fileid":"030008050057230A77FEB42D9B7D2FB424E317-3B01-8066-DABC-7C9B74ADE438"}],"security":{"encrypt_string":"EZIdNEWjiLVksbbEOeHLaC23yrK3W0Np4qoMg4Nijic=","ip":2746431115},"video":{"logo":["http://r2.ykimg.com/0541040857230A846A0A430458F07AAA","http://r2.ykimg.com/0542040857230A846A0A430458F07AAA","http://r2.ykimg.com/0543040857230A846A0A430458F07AAA"],"title":"video_id:3468941","source":53093,"encodeid":"CMzQ1MTA3Mg==","description":"","userid":765164847},"network":{"dma_code":"17816","area_code":"442000"}},"cost":0.007000000216066837}`);
		let info = {data12:data.data, data10:data.data};
		console.log(info);
		extractFlvPath(info).then(res => console.log(res));
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
	//var headers = new Headers();
	//headers.append('sethdr-Referer', 'http://static.youku.com/');
	//headers.append('sethdr-Cookie', '__ysuid'+new Date().getTime()/1e3);
	return Promise.all([
		fetch('http://play.youku.com/play/get.json?vid='+vid+'&ct=10', {credentials: 'include'}).then(res => res.json()),
		fetch('http://play.youku.com/play/get.json?vid='+vid+'&ct=12', {credentials: 'include'}).then(res => res.json()),
	]).then(res => {
		var data10 = res[0].data;
		var data12 = res[1].data;
		console.log('youku:', 'data10', data10, 'data12', data12);
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
		var videoId = scripts.filter(x => x.match(/videoId:/));
		if (videoId) {
			videoId = videoId[0].match(/videoId: *"(\d+)"/);
			if (videoId)
				return getVideosByVideoId(videoId[1]);
		}
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

