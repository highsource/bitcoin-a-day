const AWS = require('aws-sdk');

if (!AWS.config.region) {
	AWS.config.update({region: 'eu-central-1'});
}

//const ENCRYPTED_BITSTAMP_CUSTOMER_ID = 'AQICAHg3EDivGcQ+weJzvX4THVnJy/nhoHmMQLPamSDzbtVh5wFlRoiFo/Fc11O+ku7sqKK8AAAAZjBkBgkqhkiG9w0BBwagVzBVAgEAMFAGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMFsa9fkDbOpWM1OHVAgEQgCNLzscYCk4dZD9C0+f38RKOEE3zZb7Lev5fZ1M4Skwps4SEVg==';
//const ENCRYPTED_BITSTAMP_KEY = 'AQICAHg3EDivGcQ+weJzvX4THVnJy/nhoHmMQLPamSDzbtVh5wEY2ZC267Glz7B9saK3Y6smAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQM4BW/1Vf/9Woc+wsRAgEQgDtXo9xyIO1aCOKtNf4DAyviJwTWGoii/0sANeEYkLSxdPQtrkIOTASPfoprPLVTTm0FMV10JTveUR5ozg==';
//const ENCRYPTED_BITSTAMP_SECRET = 'AQICAHg3EDivGcQ+weJzvX4THVnJy/nhoHmMQLPamSDzbtVh5wGFAoYCI/WyZTMgzb7nTzRHAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQMBTvkgfY3L3KU37vWAgEQgDtOAUzcIbVMVoGa5Y6zvQTqBfcCFDzWIfyScUg3ASON0Tgd5KJ2VZ07E+YrUss3BsRcLKBliuABfMQmMw==';
const ENCRYPTED_BITSTAMP_CUSTOMER_ID = process.env['BITSTAMP_CUSTOMER_ID'];
const ENCRYPTED_BITSTAMP_KEY = process.env['BITSTAMP_KEY'];
const ENCRYPTED_BITSTAMP_SECRET = process.env['BITSTAMP_SECRET'];
//const VALUE = 5;
const VALUE = Number(process.env['VALUE']);

let BITSTAMP_PROPERTIES;

const MINIMUM_VALUE = 5;

if (isNaN(VALUE) || VALUE < MINIMUM_VALUE) {
	throw new Error("Invalid value [" + value + "], must be a number not less than [" + MINIMUM_VALUE + "].");
}

const kms = new AWS.KMS();

const decrypt = function(encrypted) {
	return new Promise(function(resolve, reject) {
		kms
			.decrypt({ CiphertextBlob: new Buffer(encrypted, 'base64') })
			.promise()
			.then(data => resolve(data.Plaintext.toString('ascii')))
			.catch(reject)
	});
};

const decryptBitstampProperties = new Promise(function(resolve, reject){
	Promise
	.all([
		decrypt(ENCRYPTED_BITSTAMP_CUSTOMER_ID),
		decrypt(ENCRYPTED_BITSTAMP_KEY),
		decrypt(ENCRYPTED_BITSTAMP_SECRET)])
	.then(values => {
		BITSTAMP_PROPERTIES = { customerId: values[0], key: values[1], secret: values[2] };
		resolve(BITSTAMP_PROPERTIES);
	})
	.catch(reject);
});

const doWithBitstampProperties = new Promise(function(resolve, reject){
	if (BITSTAMP_PROPERTIES) {
		resolve(BITSTAMP_PROPERTIES);
	} else {
		decryptBitstampProperties.then(resolve).catch(reject);
	}
});

const doit = function(customerId, key, secret, value) {
	let message = "Buying " + value + " worth of BTC using customerId " + customerId + ".";
	console.log(message);
	return message;
};

exports.handler = (event, context, callback) => {
	doWithBitstampProperties.then(bitstampProperties => callback(null, doit(bitstampProperties.customerId, bitstampProperties.key, bitstampProperties.secret, VALUE)));
};