import { awsSes, extractResponse } from './index.js'
import { post } from 'httpie'

const generateRequest = awsSes({
	credentials: {
		region: process.env.AWS_REGION,
		accessKeyId: process.env.AWS_ACCESS_KEY_ID,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	},
	// addMemberProperty: false
})

const sendEmail = async email => {
	const { url, headers, body } = await generateRequest('SendEmail', email)

	let response
	try {
		response = await post(url, { headers, body })
	} catch (error) {
		response = error
	}

	return {
		success: response.statusCode === 200,
		response: extractResponse(response.data),
	}
}

const { success, response } = await sendEmail({
	Destination: {
		ToAddresses: [
			'me@site.com',
		],
	},
	Message: {
		Body: {
			Text: {
				Charset: 'UTF-8',
				Data: 'This is the plaintext message body.',
			},
		},
		Subject: {
			Charset: 'UTF-8',
			Data: 'Hello this is a test',
		},
	},
	ReplyToAddresses: [
		'office@site.com',
	],
	Source: 'office@site.com',
})

console.log('success:', success)
console.log('response:', response)
