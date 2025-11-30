#!/bin/bash

# 🚀 NexusLink - Push to GitHub Script
# Run this after creating GitHub repository

set -e  # Exit on error

echo "🔍 Checking current directory..."
cd /home/natama/Projects

echo ""
echo "📋 Current git status:"
git status --short | head -20

echo ""
echo "⚠️  IMPORTANT: Make sure you created GitHub repository first!"
echo ""
read -p "Enter your GitHub repository SSH URL (git@github.com:username/repo.git): " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ No URL provided. Exiting."
    exit 1
fi

echo ""
echo "🔗 Setting up remote..."
git remote remove origin 2>/dev/null || echo "No existing remote"
git remote add origin "$REPO_URL"
git remote -v

echo ""
echo "✅ Remote configured!"
echo ""
read -p "Ready to commit and push? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
    echo "❌ Aborted by user"
    exit 1
fi

echo ""
echo "📝 Creating initial commit..."
git add .

echo ""
echo "📊 Files to be committed:"
git status --short | wc -l
echo " files staged"

git commit -m "🚀 Initial commit: NexusLink production-ready system

- Backend: Go API + Agent with DynamoDB & Redis
- Frontend: Next.js 16 dashboard with analytics
- Features: A/B testing, webhooks, rate limiting, link groups
- Production: Docker, SSL automation, systemd services, monitoring
- Documentation: Complete guides for deployment & development

Components:
- nexuslink/ - Go backend (API server + Agent)
- nexuslink-dashboard/ - Next.js admin dashboard
- docs/ - Historical documentation & FASE summaries
- deployment/ - Production deployment scripts & configs

FASE 7 COMPLETE ✅"

echo ""
echo "🚀 Pushing to GitHub..."
git branch -M main
git push -u origin main

echo ""
echo "✅ SUCCESS! Repository pushed to GitHub"
echo ""
echo "🔗 Visit your repository:"
echo "   ${REPO_URL/git@github.com:/https://github.com/}"
echo ""
echo "📝 Next steps:"
echo "   1. Verify README displays correctly on GitHub"
echo "   2. Clone on VPS: git clone $REPO_URL"
echo "   3. Deploy: cd nexuslink-project/nexuslink && sudo ./deployment/scripts/deploy.sh all"
echo ""
