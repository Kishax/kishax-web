# Web Server Makefile
# S3へのDockerイメージアップロード

.PHONY: build-image upload-image help

IMAGE_NAME := kishax-web
IMAGE_TAG := latest
S3_BUCKET := kishax-production-docker-images
S3_PATH := web
AWS_PROFILE := AdministratorAccess-126112056177

help:
	@echo "Available targets:"
	@echo "  build-image          - Build Docker image (linux/amd64)"
	@echo "  upload-image   - Upload Docker image to S3"
	@echo "  deploy-image            - Build and upload Docker image"

build-image:
	@echo "Building Docker image for linux/amd64..."
	docker build --platform linux/amd64 -t $(IMAGE_NAME):$(IMAGE_TAG) .
	@echo "Build complete: $(IMAGE_NAME):$(IMAGE_TAG)"

upload-image:
	@echo "Saving Docker image to tar.gz..."
	docker save $(IMAGE_NAME):$(IMAGE_TAG) | gzip > $(IMAGE_NAME)-$(IMAGE_TAG).tar.gz
	@echo "Uploading to S3..."
	aws s3 cp $(IMAGE_NAME)-$(IMAGE_TAG).tar.gz \
		s3://$(S3_BUCKET)/$(S3_PATH)/$(IMAGE_NAME)-$(IMAGE_TAG).tar.gz \
		--profile $(AWS_PROFILE)
	@echo "Cleaning up local tar.gz file..."
	rm $(IMAGE_NAME)-$(IMAGE_TAG).tar.gz
	@echo "Upload complete!"

deploy-image: build-image upload-image
