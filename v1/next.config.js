/** @type {import('next').NextConfig} */
const path = require("path") // Import path module

const nextConfig = {
	reactStrictMode: true,
	webpack: (config) => {
		config.resolve.alias = {
			...config.resolve.alias,
			react: path.resolve(__dirname, "node_modules/react"),
			"react-dom": path.resolve(__dirname, "node_modules/react-dom")
		}
		return config
	},
	async headers() {
		return [
			{
				source: "/.well-known/agility-app.json",
				headers: [
					{
						// Need to allow CORS requests to at LEAST the app definition
						key: "Access-Control-Allow-Origin",
						value: "*"
					}
				]
			}
		]
	}
}

module.exports = nextConfig
