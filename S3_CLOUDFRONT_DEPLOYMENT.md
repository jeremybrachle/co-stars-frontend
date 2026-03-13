# S3 And CloudFront Deployment Guide

This version of the app can be hosted on AWS as a static website using the built-in demo data only.

The recommended setup is:

1. Build the app locally into `dist/`
2. Upload the contents of `dist/` to an S3 bucket
3. Put CloudFront in front of the bucket
4. Configure CloudFront to return `index.html` for SPA routes

This does not require a live API.

## What `dist/` Is

`dist/` is the production build output created by Vite.

It is the folder you deploy to AWS.

You do not deploy `src/` or the TypeScript files directly.

Yes, you should rebuild `dist/` every time you deploy.

## Local Commands To Build The App

Install dependencies:

```bash
npm ci
```

Build the production output:

```bash
npm run build
```

That creates the `dist/` folder.

## AWS Hosting Steps

1. Create an S3 bucket for the frontend files
2. Create a CloudFront distribution in front of that bucket
3. Set the CloudFront default root object to `index.html`
4. Configure CloudFront so `403` and `404` return `/index.html` with response code `200`
5. Build the app locally
6. Upload the contents of `dist/` to S3
7. Invalidate CloudFront so the new build is served

## AWS CLI Deployment Commands

Upload the build output to S3:

```bash
aws s3 sync dist/ s3://your-frontend-bucket --delete
```

Invalidate CloudFront after upload:

```bash
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## Full Manual Deploy Flow

```bash
npm ci
npm run build
aws s3 sync dist/ s3://your-frontend-bucket --delete
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## Notes

- This app uses client-side routing, so the CloudFront SPA fallback is required.
- `dist/` is generated output, so rebuild it for each deployment.
- This demo-only deployment does not require `.env.production`.
- This demo-only deployment does not require snapshot refresh commands.
- You do not need Terraform to get started.
- You can automate this with GitHub Actions using `.github/workflows/deploy.yml`.

## GitHub Actions Setup

This repo can deploy with the hosted GitHub runner. You do not need to manage a custom runner just to push static files to AWS.

Recommended setup:

1. Create an IAM role in AWS that GitHub Actions can assume with OIDC.
2. Give that role permission to write to your S3 bucket and create CloudFront invalidations.
3. In GitHub, go to `Settings` -> `Secrets and variables` -> `Actions`.
4. Add Actions variables for:
	- `AWS_REGION`
	- `AWS_S3_BUCKET`
	- `AWS_CLOUDFRONT_DISTRIBUTION_ID`
	- `AWS_ROLE_ARN`
	- `VITE_SNAPSHOT_MANIFEST_URL`
5. Optionally create an environment named `production` under `Settings` -> `Environments` if you want approvals or environment-scoped values.

`VITE_SNAPSHOT_MANIFEST_URL` should point at the public hosted manifest location, for example `https://your-domain/co-stars/prod/frontend-manifest.json`.

The bucket name and distribution ID do not have to be treated as high-value secrets, but keeping them in GitHub repository variables keeps environment-specific values out of the repo.

Do not store long-lived `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in the repo. Prefer OIDC role assumption through `aws-actions/configure-aws-credentials`.

Do not commit an `.env` file for deployment credentials or AWS infrastructure settings. This frontend does not need a committed deployment env file for the S3 and CloudFront workflow.

The workflow currently deploys on:

- manual `workflow_dispatch` runs from the GitHub Actions tab

You can manually run the workflow against `main` or a branch associated with an open pull request by choosing that branch in the workflow run dialog.