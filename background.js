chrome.browserAction.onClicked.addListener(function(){	
	chrome.tabs.executeScript(null, {file: "bundle.js"});
});

chrome.webRequest.onBeforeSendHeaders.addListener(
	function(details) {
		var sethdr = {};
		for (var i = 0; i < details.requestHeaders.length; i++) {
			var header = details.requestHeaders[i];
			if (header.name.substr(0,7) == 'sethdr-') {
				sethdr[header.name.substr(7)] = header.value;
			}
		}
		for (var i = 0; i < details.requestHeaders.length; i++) {
			var header = details.requestHeaders[i];
			if (sethdr[header.name]) {
				header.value = sethdr[header.name];
				delete sethdr[header.name];
			}
		}
		for (var k in sethdr) {
			details.requestHeaders.push({name:k, value:sethdr[k]});
		}
		return {requestHeaders: details.requestHeaders};
	},
	{urls: ["http://play.youku.com/*"]},
	["blocking", "requestHeaders"]
);

