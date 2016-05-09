/*  tudou 
 *  @朱一
 */
// TODO:
// cannot play http://www.tudou.com/programs/view/TXBFQYX6F04/ missing vcode

var youku = require('./youku')
var querystring = require('querystring');

exports.testUrl = function (url) {
  return /tudou\.com/.test(url);
}

exports.getVideos = function (url) {  
	if (window.pageConfig && window.pageConfig.vcode)
		return youku.getVideosByVcode(window.pageConfig.vcode);
	else return fetch(url, {credentials: 'include'}).then(res => res.text()).then(res => {
		var vcode = res.match(/vcode: '(\S+)'/);
		console.log(vcode);
		if (vcode) 
			return youku.getVideosByVcode(vcode[1]);
	})
}

exports.getDanmuRaw = function(id, params) {
	//http://service.danmu.tudou.com/list?7122
	//FormData: uid=81677981&mcount=1&iid=132611501&type=1&ct=1001&mat=6
	//mat=minute at
	params.uid = params.uid || 0;
	params.mcount = params.mcount || 1;
	params.type = params.type || 1;
	params.ct = params.ct || 1001;
	var body = querystring.stringify(params);
	return fetch('http://service.danmu.tudou.com/list?'+id, {
		credentials: 'include', body, method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
	}).then(res => res.json());
}

