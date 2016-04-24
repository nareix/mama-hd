
var callbackPrefix = 'MAMA2_HTTP_JSONP_CALLBACK'
var callbackCount  = 0
var timeoutDelay   = 10000

function callbackHandle () {
  return callbackPrefix + callbackCount++
}

function jsonp(url, callbackKey) {
	return new Promise((fulfill, reject) => {
		callbackKey = callbackKey || 'callback'

		var _callbackHandle = callbackHandle()  

		window[_callbackHandle] = function (rs) {
			clearTimeout(timeoutTimer)
			delete window[_callbackHandle]
			fulfill(rs)
		}

		var timeoutTimer = setTimeout(function () {
			delete window[_callbackHandle]
			reject(new Error('jsonp timeout'))
		}, timeoutDelay)

		var src = url + (url.indexOf('?') >= 0 ? '&' : '?') + callbackKey + '=' + _callbackHandle;
		fetch(src).then(res => res.text()).then(res => {
			eval(res)
		})
	})
}

module.exports = jsonp
