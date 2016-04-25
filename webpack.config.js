module.exports = {
	entry: "./index.js",
	output: {
		path: __dirname,
		filename: "./mama-hd/bundle.js"
	},
	module: {
		loaders: [
			{ test: /\.css$/, loader: "style!css" }
		]
	}
};

