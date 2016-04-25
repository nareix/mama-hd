module.exports = {
	entry: "./index.js",
	output: {
		path: __dirname,
		filename: "./mama-hd/bundle.js"
	},
	module: {
		loaders: [
			{
				test: /\.js$/,
				loader: 'babel-loader',
				query: {
					presets: ['es2015']
				}
			}
		]
	}
};

