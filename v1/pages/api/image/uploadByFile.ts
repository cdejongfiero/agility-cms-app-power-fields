import nextConnect from "next-connect"
import type { NextApiRequest, NextApiResponse } from "next"
import * as index from "@agility/management-sdk"
import fs from "fs"
import sizeOf from "image-size"
import FormData from "form-data"
import { getNewFileName } from "../../../utils/imageUtils"
import multiparty from "multiparty"

const middleware = nextConnect()

/**
 * This middleware is used to parse the data passed from the client side.
 * If a file is being passed it temporarily uploads the file, and passes the file data to the next handler
 */
middleware.use(async (req: any, res: any, next: any) => {
	const form = new multiparty.Form()

	await form.parse(req, function (err: any, fields: any, files: any) {
		// fields are whatever additional request data is passed, and files is w.e. files being uploaded
		req.body = fields
		req.files = files
		next()
	})
})

const handler = nextConnect()

handler.use(middleware)

interface NextApiRequestExtended extends NextApiRequest {
	files: any
}

handler.post(async (req: NextApiRequestExtended, res: NextApiResponse) => {
	const token = req.body.token[0]
	const assetFolder = req.body.assetFolder[0]
	const guid = req.body.guid[0]

	const options = new index.Options()
	options.token = token

	const client = new index.ApiClient(options)

	//parse the image from the request
	const image = req.files.image[0]

	//get the dimensions of the image
	const size = sizeOf(image.path)

	//get the contents of the image
	const fileContent = fs.createReadStream(image.path)

	//build a unique filename with a timestamp
	const fileName = getNewFileName(image.originalFilename)

	const form = new FormData()
	form.append("files", fileContent, fileName)

	try {
		const uploadAsset = await client.assetMethods.upload(form as any, assetFolder, guid)
		return res.status(200).json({
			success: 1,
			file: {
				url: uploadAsset[0].edgeUrl,
				size
			}
		})
	} catch (err) {
		console.error(err)
		return res.status(500).json({ error: err })
	}
})

export const config = {
	api: {
		bodyParser: false
	}
}

export default handler
