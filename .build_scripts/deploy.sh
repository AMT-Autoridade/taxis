#!/usr/bin/env bash
set -e # halt script on error

echo "Get ready, we're pushing to github!"
mkdir dist
mv ./export/*.json dist
mv ./files dist
cd dist
git init
git config user.name "Travis-CI"
git config user.email "travis@somewhere.com"
git add .
git commit -m "CI deploy to github"
git push --force --quiet "https://${GH_TOKEN}@github.com/${TRAVIS_REPO_SLUG}.git" master:api