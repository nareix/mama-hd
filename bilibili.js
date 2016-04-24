
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
			var src = Array.prototype.slice.call(doc.querySelectorAll('durl > url')).map(url => url.textContent );
			return {
				src: src,
				commentUrl: 'http://comment.bilibili.com/'+cid+'.xml',
			}
		})
	});
}

