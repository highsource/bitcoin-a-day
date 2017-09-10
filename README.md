# Bitcoin A Day

This repository provides scripts to set up a cloud-scheduled task to buying €X worth of Bitcoin.
This leverages the [Dollar-Cost Averaging (DCA)](http://www.investopedia.com/terms/d/dollarcostaveraging.asp) effect.

# Disclaimers

This does not constitute any investment advice, neither expressed nor implied.

Trading cryptocurrencies may or may not lead to a total loss, you act on your own risk.

The [license](LICENSE) contains further disclaimers, including but not limited to "Disclaimer of Warranty", "Limitation of Liability", "Accepting Warranty or Additional Liability".

# What it does

The `setup.sh` script creates a scheduled task which buys certain value in Euros worth of Bitcoin every day.
For instance, you can use it to set up buying €5 worth of Bitcoin every day.

Scheduled task is created using AWS and runs in the cloud; it will run independent of whether users machine is online or not.

# What is needed

* `npm` and `zip` installed locally.
* AWS account.
* AWS command-line utilities (`aws`) installed locally.
* Bitstamp account.
* Enabled Bitstamp API access (you'll need customer id, API key and secret).

# How to use it

Clone this repository:

```
git clone https://github.com/highsource/bitcoin-a-day.git
```

**Review the code.** I mean it. You are about to give this code access to your Bitstamp account.  
Assume I am a malicious actor and wrote this code to steal from you or waste your money for fun or profit. (I did not, but assume so.)
Check the code, make sure you understand what it does.

Run:
```
setup.sh "<customerId>" "<key>" "<secret>" <value>
```

Parameters:

* `<customerId>` - Bitstamp customer id
* `<key>` - Bitstamp API key
* `<secret>` - Bitstamp API secret
* `<value>` - Value in Euros 

Check `output.txt`.

# What it does, exactly

Essentially, the `setup.sh` script creates an AWS lambda function which is triggered by a CRON-scheduled CloudWatch event to run every day.
Bitstamp account properties (customer id, API key and secret) are passed to the lambda function as environment variables.
To protect this sensitive information, customer id, API key and secret are encrypted using AWS KMS and passed in encrypted form.
They are not stored or logged in clear-text form anywhere.

To be specific, the `setup.sh` does the following:

* Generates a random id which will be used in names of created object later on to make those names unique.
* Performs `npm install` and packages the lambda function in a ZIP file.
* Creates an AWS IAM role for the lambda function, attaches the `AWSLambdaBasicExecuteRole` policy to that role.
* Creates an AWS KMS encryption key (and an alias for it), adds a policy to allow the lambda function role to use it for decryption.
* Encrypts Bitstamp customer id, API key and secret using the created AWS KMS encryption key.
* Creates an AWS Lambda function, passing value to buy, encrypted customer id, key and secret as envrionment variables.
* Creates a CloudWatch rule to trigger the lambda function every day at `12:00`

# Credits

* Inspired by: https://twitter.com/levelsio/status/900493157623902208
* https://gist.github.com/levelsio/ee9539134035492ba77a7be1b49ed832

# License

Licensed under [APL 2.0](LICENSE).