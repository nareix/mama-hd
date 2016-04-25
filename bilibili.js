
module.exports.testUrl = url => url.match('bilibili.com/')

module.exports.getVideos = function (url) {
	return fetch(url).then(res => res.text()).then(res => {
		var cid = res.match(/cid=(\d+)/);
		if (cid) 
			return cid[1];
	}).then(function(cid) {
		if (!cid)
			return;
		return fetch("http://interface.bilibili.com/playurl?appkey=8e9fc618fbd41e28&cid="+cid)
		.then(res => res.text()).then(res => {
			var parser = new DOMParser();
			var doc = parser.parseFromString(res, 'text/xml');
			var array = x => Array.prototype.slice.call(x);
			var duration = 0.0;
			array(doc.querySelectorAll('durl > length')).forEach(len => duration += +len.textContent);
			var src = array(doc.querySelectorAll('durl > url')).map(url => url.textContent );
			return {
				duration: duration/1000.0,
				src: src,
				commentUrl: 'http://comment.bilibili.com/'+cid+'.xml',
			}
		})
	});
}

