#!/bin/bash

echo "Initializing database..."

docker-compose exec backend npx prisma migrate deploy

echo "Database initialized successfully!"