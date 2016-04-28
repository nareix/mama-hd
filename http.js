
exports.fetch = (url, opts) => {
	opts = opts || {};
	var retries = opts.retries;

	if (retries) {
		return new Promise(function(resolve, reject) {
			var wrappedFetch = function(n) {
				fetch(url, opts).then(function(res) {
					if (!(res.status >= 200 && res.status < 300)) {
						if (n > 0) {
							setTimeout(function() {
								wrappedFetch(--n);
							}, 1000);
						} else {
							reject(new Error('try to death'));
						}
					} else {
						resolve(res);
					}
				}).catch(reject);
			}
			wrappedFetch(retries);
		});
	}

	return fetch(url, opts);
};

