import axios from 'axios'
import type { NextApiRequest, NextApiResponse } from "next";
import { getNewFileName } from '../../../utils/imageUtils';
import * as index from "@agility/management-sdk"
import nextConnect from 'next-connect';
import FormData from 'form-data'

const handler = nextConnect();

handler.post(async (req: NextApiRequest, res: NextApiResponse) => {
	const token = req.body.token
	const assetFolder = req.body.assetFolder
	const guid = req.body.guid
	const url = req.body.url

	const options = new index.Options()
	options.token = token

	const client = new index.ApiClient(options)

	//download the image from Url
	const imageReq = await axios.get(url, { responseType: 'stream' });
	const fileContent = imageReq.data;

	//build a unique filename with timestamp
	let fileName = url.substring(url.lastIndexOf('/') + 1);
	fileName = getNewFileName(fileName);

	const form = new FormData();
	form.append('files', fileContent, fileName);

	try {
		const uploadAsset = await client.assetMethods.upload(form as any, assetFolder, guid)

		return res.status(200).json({
			success: 1,
			file: {
				url: uploadAsset[0].edgeUrl,
			}
		});

	} catch (err) {
		console.error(err)
		return res.status(500).json({ error: err })
	}
})

export default handler
