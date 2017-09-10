const AWS = require('aws-sdk');
const crypto = require('crypto');
const got = require('got');

const CURRENCY_PAIR = 'btceur';
const TICKER_URL = 'https://www.bitstamp.net/api/v2/ticker/' + CURRENCY_PAIR + '/';
const BUY_LIMIT_ORDER_URL = 'https://www.bitstamp.net/api/v2/buy/' + CURRENCY_PAIR + '/';

if (!AWS.config.region) {
	AWS.config.update({region: 'eu-central-1'});
}

const ENCRYPTED_BITSTAMP_CUSTOMER_ID = process.env['BITSTAMP_CUSTOMER_ID'];
const ENCRYPTED_BITSTAMP_KEY = process.env['BITSTAMP_KEY'];
const ENCRYPTED_BITSTAMP_SECRET = process.env['BITSTAMP_SECRET'];
const VALUE = Number(process.env['VALUE']);
const MINIMUM_VALUE = 5;

if (isNaN(VALUE) || VALUE < MINIMUM_VALUE) {
	throw new Error("Invalid value [" + value + "], must be a number not less than [" + MINIMUM_VALUE + "].");
}

let BITSTAMP_PROPERTIES; 

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
const decryptBitstampProperties = function() {
	return new Promise(function(resolve, reject){
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
})};


const doWithBitstampProperties = function() {
	return new Promise(function(resolve, reject){
		if (BITSTAMP_PROPERTIES) {
			resolve(BITSTAMP_PROPERTIES);
		} else {
			decryptBitstampProperties().then(resolve).catch(reject);
		}
	});
};

const createAuthData = function(customerId, key, secret) {
	let nonce = (new Date()).getTime();
	let message = nonce + customerId + key;
	let signature = crypto.createHmac('sha256', new Buffer(secret, 'utf8')).update(message).digest('hex').toUpperCase();
	return { key, signature, nonce};
};

const getAskPrice = new Promise(function(resolve, reject){

		got(TICKER_URL).then(response => {
			let result = JSON.parse(response.body);
			let ask = Number(result.ask);
			if (!isNaN(ask)) {
				resolve(ask);
			} else {
				throw new Error("Could not parse the ask price from [" + BTCEUR_TICKER_URL + "] response:\n" + response.body);
			}
		}).catch(reject);
});

const buyLimitOrder = function(customerId, key, secret, value, askPrice) {

	let amount = value / askPrice;

	let roundedAmount = Math.ceil(amount * Math.pow(10,5)) / Math.pow(10,5);

	let order = createAuthData(customerId, key, secret);
	order.amount = roundedAmount;
	order.price = askPrice;
	console.log("Buying " + roundedAmount + " of BTC for price " + askPrice + " for total value of " + (roundedAmount * askPrice) + ".");
	return new Promise(function(resolve, reject) {
		console.log("Buying order:");
		console.log(order);
		got.post(BUY_LIMIT_ORDER_URL, {
			body : order,
			form: true
		}).then(response => {
			let result = JSON.parse(response.body);
			resolve(result);
		}).catch(reject);
	});
};

const getAskPriceAndBuyLimitOrder = function(customerId, key, secret, value) {
	return new Promise(function(resolve, reject) {
		getAskPrice
			.then(askPrice => buyLimitOrder(customerId, key, secret, value, askPrice).then(resolve).catch(reject))
			.catch(reject);
	});
};

exports.handler = (event, context, callback) => {
	doWithBitstampProperties()
		.then(bitstampProperties => 
			getAskPriceAndBuyLimitOrder(bitstampProperties.customerId, bitstampProperties.key, bitstampProperties.secret, VALUE)
				.then(result => callback(null, result))
				.catch(error => callback(error)))
		.catch(error => callback(error));
};