include .env

.PHONY: run-local
run-local:
	@echo "INFO: Starting Kishax AWS SQS Worker..."
	@MC_WEB_SQS_ACCESS_KEY_ID=$(MC_WEB_SQS_ACCESS_KEY_ID) \
	MC_WEB_SQS_SECRET_ACCESS_KEY=$(MC_WEB_SQS_SECRET_ACCESS_KEY) \
	WEB_TO_MC_QUEUE_URL=$(WEB_TO_MC_QUEUE_URL) \
	MC_TO_WEB_QUEUE_URL=$(MC_TO_WEB_QUEUE_URL) \
	REDIS_URL=http://localhost:6379 \
	LOG_LEVEL=$(LOG_LEVEL) \
	QUEUE_MODE=$(QUEUE_MODE) \
	java -jar ~/.m2/repository/net/kishax/aws/kishax-api/$(KISHAX_AWS_VERSION)/kishax-api-$(KISHAX_AWS_VERSION)-with-dependencies.jar

.PHONY: cp-aws-jar
cp-aws-jar:
	@echo "INFO: Copying Kishax AWS SQS Worker..."
	cp ~/.m2/repository/net/kishax/aws/kishax-api/$(KISHAX_AWS_VERSION)/kishax-api-$(KISHAX_AWS_VERSION)-with-dependencies.jar ./
	@echo "INFO: Copyed Kishax AWS SQS Worker."

.PHONY: logs
logs:
	@echo "INFO: Tailing logs..."
	@docker compose logs kishax-api web -f || true
