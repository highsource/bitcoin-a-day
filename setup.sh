#!/bin/bash
bitstamp_customer_id=$1
bitstamp_key=$2
bitstamp_secret=$3
value=$4
random_id=$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 8 | head -n 1)
bitcoin_a_day=bitcoin-a-day-"${random_id}"

rm output.txt

npm install
chmod 644 index.js
chmod -R 644 node_modules
zip -q -r "${bitcoin_a_day}" index.js node_modules 

iam_role_name="${bitcoin_a_day}"-lambda
echo Creating IAM role "${iam_role_name}" for the lambda function.
aws iam create-role --role-name "${iam_role_name}" --assume-role-policy-document file://bitcoin-a-day-lambda-role-policy-document.json --query "Role.Arn" --output text
iam_role_arn_query='Roles[?RoleName==`'"${iam_role_name}"'`].Arn'
iam_role_arn=$(aws iam list-roles --query "${iam_role_arn_query}" --output text)
echo IAM role name for the lambda function: ${iam_role_name} >> output.txt
echo IAM role ARN for the lambda function: ${iam_role_arn} >> output.txt

echo Attaching IAM policy arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole to lambda function role "${iam_role_name}"
aws iam attach-role-policy --role-name "${iam_role_name}" --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
sleep 5s

echo Creating encryption key policy.
owner_id=$(aws ec2 describe-security-groups --group-names 'Default' --query 'SecurityGroups[0].OwnerId' --output text)
sed -e "s!@owner_id@!${owner_id}!g; s!@iam_role_arn@!${iam_role_arn}!g" encryption-key-policy-template.json > encryption-key-policy.json
echo Creating encryption key.
encryption_key_id=$(aws kms create-key --policy fileb://encryption-key-policy.json --description "Bitcoin A Day" --query KeyMetadata.KeyId --output text)
echo Encryption key id: ${encryption_key_id} >> output.txt
encryption_key_alias=alias/"${bitcoin_a_day}"-encryption-key
echo Creating encryption key alias "${encryption_key_alias}".
aws kms create-alias --alias-name "${encryption_key_alias}" --target-key-id "${encryption_key_id}"
echo Encryption key alias: ${encryption_key_alias} >> output.txt
encryption_key_arn=$(aws kms describe-key --key-id "${encryption_key_id}" --query KeyMetadata.Arn)
echo Encryption key ARN: "${encryption_key_arn}" >> output.txt

echo Encrypting Bitstamp customer id, key and secret.
encrypted_bitstamp_customer_id=$(aws kms encrypt --key-id "${encryption_key_id}" --plaintext "${bitstamp_customer_id}" --query CiphertextBlob --output text)
encrypted_bitstamp_key=$(aws kms encrypt --key-id "${encryption_key_id}" --plaintext "${bitstamp_key}" --query CiphertextBlob --output text)
encrypted_bitstamp_secret=$(aws kms encrypt --key-id "${encryption_key_id}" --plaintext "${bitstamp_secret}" --query CiphertextBlob --output text)
echo Encrypted Bitstamp customer id: "${encrypted_bitstamp_customer_id}" >> output.txt
echo Encrypted Bitstamp key: "${encrypted_bitstamp_key}" >> output.txt
echo Encrypted Bitstamp secret: "${encrypted_bitstamp_secret}" >> output.txt

echo Creating environment properties for the lambda function.
sed -e "s!@encrypted_bitstamp_customer_id@!${encrypted_bitstamp_customer_id}!g; s!@encrypted_bitstamp_key@!${encrypted_bitstamp_key}!g; s!@encrypted_bitstamp_secret@!${encrypted_bitstamp_secret}!g; s!@value@!${value}!g" bitcoin-a-day-env-template.json > bitcoin-a-day-env.json

echo Creating lambda function.
lambda_function_name="${bitcoin_a_day}"
lambda_function_arn=$(aws lambda create-function --function-name "${lambda_function_name}" --runtime nodejs6.10 --role "$iam_role_arn" --handler index.handler --environment file://bitcoin-a-day-env.json --kms-key-arn "${encryption_key_arn}" --zip-file fileb://"${bitcoin_a_day}".zip --query FunctionArn --output text)
echo Lambda function name: "${lambda_function_name}" >> output.txt
echo Lambda function ARN: "${lambda_function_arn}" >> output.txt

echo Creating CloudWatch rule to trigger the lambda function.
trigger_rule_name="${lambda_function_name}"-rule
trigger_rule_arn=$(aws events put-rule --name "${trigger_rule_name}" --schedule-expression "cron(0 12 * * ? *)" --query RuleArn --output text)
echo CloudWatch trigger rule name: "${trigger_rule_name}" >> output.txt
echo CloudWatch trigger rule ARN: "${trigger_rule_arn}" >> output.txt
trigger_rule_statement_id="${trigger_rule_name}"-event
aws lambda add-permission --function-name "${lambda_function_name}" --statement-id "${trigger_rule_statement_id}" --action "lambda:InvokeFunction" --principal events.amazonaws.com --source-arn "${trigger_rule_arn}"
sed -e "s!@lambda_function_arn@!${lambda_function_arn}!g" targets-template.json > targets.json
aws events put-targets --rule "${trigger_rule_name}" --targets file://targets.json