#!/bin/bash

echo "Generating rate limit data..."

# Make 20 requests to create rate limit entries
for i in {1..20}; do
  curl -s "http://localhost:9090/r/test" > /dev/null 2>&1 &
done

wait

echo "Done! Check http://localhost:3000/rate-limits"
