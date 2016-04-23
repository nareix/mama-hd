window.IsInChromeExtension = true;
window.flvMediaSource = require('./flvMediaSource');
window.flvMediaSource.debug = true;
window.flvMediaSource.fetchAB = (url, _opts) => {
	let range;
	let opts = {};
	if (_opts.start || _opts.end) {
		range = 'bytes=';
		if (_opts.start)
			range += _opts.start;
		else
			range += '0';
		range += '-'
		if (_opts.end)
			range += _opts.end-1;
	}
	if (range !== undefined) {
		opts.headers = {Range: range}
	}
	return fetch(url, opts).then(res => res.arrayBuffer());
}
require('./index');
