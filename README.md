# Bitcoin A Day

This repository provides scripts to schedule buying €5 worth of bitcoin every day.
This leverages [Dollar-Cost Averaging (DCA)](http://www.investopedia.com/terms/d/dollarcostaveraging.asp) effect.

WORK IN PROGRESS

# Prerequisites

* AWS account
  * Installed AWS command-line utilities
* Bitstamp account
  * Enabled API access

# What it does

* Take `bitstamp-properties.json` as input
* Encrypt with AES 256 using randomly-generated password, write output to `bitstamp-properties.json.encrypted`
* Create an S3 bucket and upload `bitstamp-properties.json.encrypted` to this bucket
* Create a IAM policy to access `bitstamp-properties.json.encrypted` in the created S3 bucket
* Create a IAM role for the lambda function
* Attach the `bitstamp-properties.json.encrypted`-access and AWS lambda basic execution role policy to the create lambda function role
* ...
* TODO
* ...

# Usage

Clone this repository:

```
git clone https://github.com/highsource/bitcoin-a-day.git
```

*Review the code.* I mean it. You are about to give this code access to your Bitstamp account - via API, but still.
Assume I am a malicious actor and wrote this code to steal from you or waste your money for fun. (I did not, but assume so.)

Create the `bitstamp-properties.json` file with properties `customerId`, `key` and `secret`

```
{
	"customerId": "r......9",
	"key": "d..............................F",
	"secret": "0..............................4"
}
```

* Execute `setup.sh`

# Credits

* Inspired by: https://twitter.com/levelsio/status/900493157623902208
* https://gist.github.com/levelsio/ee9539134035492ba77a7be1b49ed832

# License

Licensed under [APL 2.0](LICENSE).