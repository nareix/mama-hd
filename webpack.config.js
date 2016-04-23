module.exports = {
	entry: "./src/index-crx.js",
	output: {
		path: __dirname,
		filename: "./extension/mama2.crx/bundle.js"
	},
	module: {
		loaders: [
			{ test: /\.css$/, loader: "style!css" }
		]
	}
};

