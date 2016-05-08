module.exports = {
	entry: [
		"whatwg-fetch",
		"./index.js",
	],
	output: {
		path: __dirname,
		filename: "./mama-hd.safariextension/bundle.js"
	},
	module: {
		loaders: [{
			test: /\.jsx?$/,
			exclude: /(node_modules|bower_components)/,
			loader: 'babel', // 'babel-loader' is also a legal name to reference
			query: {
				presets: ['es2015'],
				plugins: ['transform-runtime'],
			}
		}],
	}
};

