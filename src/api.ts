const server = 'https://rest.fs.neo.org/v1';

type Methods = "GET" | "POST";

async function serverRequest(method: Methods, url: string, params: object, headers: any) {
	const json: any = {
		method,
		headers,
	}

	if (json['headers']['Content-Type']) {
		json['body'] = params;
	} else if (Object.keys(params).length > 0) {
		json['body'] = JSON.stringify(params);
		json['headers']['Content-Type'] = 'application/json';
	}

	let activeUrl: string = url;
	if (url.indexOf('https') === -1) {
		activeUrl = `${server}${url}`;
	}

	return fetch(activeUrl, json).catch((error: any) => error);
}

export default function api(method: Methods, url: string, params: object = {}, headers: object = {}) {
	return new Promise((resolve, reject) => {
		serverRequest(method, url, params, headers).then(async (response: any) => {
			if (response && response.status === 204) {
				resolve({ status: 'success' });
			} else {
				let res: any = response;
				if (response?.status === 200 && url.indexOf('by_id') !== -1) {
					res = await response.arrayBuffer();
					resolve(res);
				} else if (response?.status === 200) {
					res = await response.json();
					resolve(res);
				} else {
					try {
					res = await response.json();
					reject(res);
					} catch (err) {
						reject(response);
					}
				}
			}
		});
	});
}
