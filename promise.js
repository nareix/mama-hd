
exports.Cancellable = input => {
	let fulfill;
	let promise = new Promise((_fulfill, reject) => {
		fulfill = _fulfill;
		input.then(fulfill).catch(reject);
	});
	promise.cancel = fulfill;
	return promise;
}

