include .env

.PHONY: run
run:
	@echo "INFO: Starting Kishax AWS SQS Worker..."
	export MC_WEB_SQS_ACCESS_KEY_ID=$(MC_WEB_SQS_ACCESS_KEY_ID)
	export MC_WEB_SQS_SECRET_ACCESS_KEY=$(MC_WEB_SQS_SECRET_ACCESS_KEY)
	export WEB_TO_MC_QUEUE_URL=$(WEB_TO_MC_QUEUE_URL)
	export MC_TO_WEB_QUEUE_URL=$(MC_TO_WEB_QUEUE_URL)
	export REDIS_URL=$(REDIS_URL)
	export KISHAX_AWS_VERSION=$(KISHAX_AWS_VERSION)
	@java -jar ~/.m2/repository/net/kishax/aws/kishax-aws/$(KISHAX_AWS_VERSION)/kishax-aws-$(KISHAX_AWS_VERSION)-with-dependencies.jar
