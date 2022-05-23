import { createAwsSigner } from 'sign-aws-requests'
import formUrlEncoded from 'form-urlencoded'

const messageIdRegex = /<MessageId>([^<]+)/g
const requestIdRegex = /<RequestId>([^<]+)/g
const errorTypeRegex = /<Type>([^<]+)/g
const errorCodeRegex = /<Code>([^<]+)/g
const errorMessageRegex = /<Message>([^<]+)/g

export const extractResponse = xmlString => {
	const get = regex => {
		const match = regex.exec(xmlString)
		if (match) return match[1]
	}
	const hasError = xmlString.includes('<ErrorResponse')
	return {
		messageId: get(messageIdRegex),
		requestId: get(requestIdRegex),
		errorType: hasError && get(errorTypeRegex),
		errorCode: hasError && get(errorCodeRegex),
		errorMessage: hasError && get(errorMessageRegex),
	}
}

/*

From the AWS SDK documentation, it shows that the object structure of, for example, `SendEmail`
should be `{ ReplyToAddresses: [ 'me@site.com' ] }` but in the API documentation, arrays need
to be inside a sub-object named `member`, e.g. `{ ReplyToAddresses: { member: [ 'me@site.com' ] } }`
so we wrap up this nonsense in a mutating function.

You can skip this functionality by setting `addMemberProperty` to `false` on instantiation.

*/
const mutateAndAddObnoxiousMemberProperty = (params, parentWasNamedMember) => {
	Object.keys(params).forEach(key => {
		if (Array.isArray(params[key]) && !parentWasNamedMember) {
			params[key] = { member: params[key] }
		} else if (typeof params[key] === 'object') {
			mutateAndAddObnoxiousMemberProperty(params[key], key === 'member')
		}
	})
}

export const awsSes = ({ url, credentials: { region, secretAccessKey, accessKeyId }, addMemberProperty = true }) => {
	const sign = createAwsSigner({
		config: {
			service: 'ses',
			region,
			secretAccessKey,
			accessKeyId,
		},
	})

	const requestParams = {
		url: url || `https://email.${region}.amazonaws.com`,
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Host: `email.${region}.amazonaws.com`,
		},
	}

	return async (type, params) => {
		addMemberProperty && mutateAndAddObnoxiousMemberProperty(params)
		const request = {
			...requestParams,
			body: formUrlEncoded({
				...params,
				Action: type,
			}, {
				useDot: true,
			}),
		}
		const { authorization } = await sign(request)
		request.headers.Authorization = authorization
		return request
	}
}
