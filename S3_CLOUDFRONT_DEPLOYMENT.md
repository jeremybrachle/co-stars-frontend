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
- You can automate this later with GitHub Actions if you decide to add a deployment workflow.