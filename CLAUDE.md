# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Mautic deployment configuration for Coolify, containing:
- Docker Compose setup for running Mautic with MySQL and RabbitMQ
- Custom Mautic themes (currently `auto-contractor`)

## Architecture

**Docker Services:**
- `mysql` - MySQL 8.0 database
- `rabbitmq` - Message queue for async processing
- `mautic_web` - Main Mautic web application (custom image via Dockerfile)
- `mautic_cron` - Cron job runner
- `mautic_worker` - Message queue consumer

The custom Dockerfile extends `mautic/mautic:latest` and copies themes from `./themes/` into `/var/www/html/docroot/themes/`.

**Theme Structure:**
Themes follow Mautic's GrapesJS builder format with:
- `config.json` - Theme metadata (name, author, builder type, features)
- `html/*.html.twig` - Twig templates for pages, emails, forms, messages
- `assets/css/` - Stylesheets
- `assets/js/` - JavaScript

## Local Development

For local testing, use the override file with local-specific settings:

```bash
# First time setup
cp .env.example .env

# Start all services locally
docker compose -f docker-compose.local.yaml up -d

# Rebuild after theme changes
docker compose -f docker-compose.local.yaml build mautic_web
docker compose -f docker-compose.local.yaml up -d mautic_web
```

Mautic will be available at http://localhost:8080

## Common Commands

```bash
# View logs
docker compose logs -f mautic_web

# Access Mautic CLI
docker compose exec mautic_web php /var/www/html/bin/console

# Clear Mautic cache
docker compose exec mautic_web php /var/www/html/bin/console cache:clear
```

## Adding New Themes

1. Create a new directory under `themes/` with the theme name
2. Add required files: `config.json`, `html/page.html.twig`, `html/email.html.twig`, etc.
3. Rebuild and restart `mautic_web` service

Theme `config.json` format:
```json
{
  "name": "Theme Name",
  "author": "Author",
  "authorUrl": "https://example.com",
  "builder": ["grapesjsbuilder"],
  "features": ["page", "email", "form"]
}
```

## Environment Variables

Key Coolify-managed variables:
- `SERVICE_PASSWORD_64_MYSQLROOT` - MySQL root password
- `SERVICE_USER_MYSQL` / `SERVICE_PASSWORD_64_MYSQL` - MySQL user credentials
- `SERVICE_URL_MAUTIC_80` - Public URL for Mautic
