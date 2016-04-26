/*  tudou 
 *  @朱一
 */
var youku = require('./youku')

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

