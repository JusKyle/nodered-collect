#!/bin/bash

echo "Deploying collecting system..."

docker-compose up -d --build

echo "Waiting for services to start..."
sleep 10

echo "Initializing database..."
./init-db.sh

echo "Deployment completed!"