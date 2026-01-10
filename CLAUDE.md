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

## Auto-Installation

The custom Docker image supports automatic installation of Mautic on first run, eliminating the need to manually complete the web installer.

**How it works:**
- The `docker-entrypoint-wrapper.sh` script wraps the original Mautic entrypoint
- If `MAUTIC_ADMIN_EMAIL` and `MAUTIC_ADMIN_PASSWORD` are set, it automatically runs `mautic:install` command
- Installation only runs once - checks for existing users in the database to avoid re-installing
- If admin credentials are not provided, falls back to the standard web installer

**Setup for auto-installation:**
1. Copy `.env.example` to `.env`
2. Set the auto-installation variables:
   ```bash
   MAUTIC_URL=http://localhost:8080
   MAUTIC_ADMIN_EMAIL=admin@example.com
   MAUTIC_ADMIN_PASSWORD=MauticAdmin123!
   MAUTIC_ADMIN_USERNAME=admin
   MAUTIC_ADMIN_FIRSTNAME=Admin
   MAUTIC_ADMIN_LASTNAME=User
   ```
3. Start the services: `docker compose -f docker-compose.local.yaml up -d`
4. Mautic will be ready at http://localhost:8080 with the login page (not installer)

**Password requirements:**
- Mautic 5.1+ requires complex passwords (uppercase, lowercase, number, special character)
- Example valid password: `MauticAdmin123!`

**To use the web installer instead:**
- Leave `MAUTIC_ADMIN_EMAIL` and `MAUTIC_ADMIN_PASSWORD` empty in `.env`

## Local Development Workflow

### Initial Setup
```bash
# Clone and navigate to the repository
cd /path/to/mautic-coolify4

# Copy environment template
cp .env.example .env

# Edit .env with your desired credentials (optional, defaults work fine)
# nano .env

# Start all services
docker compose -f docker-compose.local.yaml up -d

# Watch installation progress
docker compose -f docker-compose.local.yaml logs -f mautic_web
```

### Testing Changes

**After modifying the wrapper script (`docker-entrypoint-wrapper.sh`):**
```bash
# Stop and remove all containers + volumes (DESTROYS DATA!)
docker compose -f docker-compose.local.yaml down -v

# Remove local data directories
rm -rf mautic_data/

# Rebuild the image
docker compose -f docker-compose.local.yaml build mautic_web

# Start fresh
docker compose -f docker-compose.local.yaml up -d

# Monitor installation
docker compose -f docker-compose.local.yaml logs -f mautic_web
```

**After modifying themes:**
```bash
# Themes are live-mounted - just clear the cache
docker compose -f docker-compose.local.yaml exec mautic_web php /var/www/html/bin/console cache:clear
```

**After modifying docker-compose or environment variables:**
```bash
# Restart affected services
docker compose -f docker-compose.local.yaml up -d

# Or restart everything
docker compose -f docker-compose.local.yaml restart
```

### Troubleshooting

**Check if auto-installation is running:**
```bash
# Watch logs in real-time
docker compose -f docker-compose.local.yaml logs -f mautic_web

# Look for these key messages:
# - "[wrapper] Running Mautic auto-install..."
# - "1 - Creating database..."
# - "2 - Creating admin user..."
# - "[wrapper] Auto-install completed successfully!"
# - "[mautic_web]: Mautic is already installed, running migrations..."
```

**Verify installation completed:**
```bash
# Check if Mautic responds
curl -I http://localhost:8080/s/login

# Should return HTTP 200

# Check database for users
docker compose -f docker-compose.local.yaml exec mysql mysql -u mautic -pmauticpassword mautic -e "SELECT id, username, email FROM users;"
```

**Common issues:**

1. **Auto-install not running**: Verify `MAUTIC_ADMIN_EMAIL` and `MAUTIC_ADMIN_PASSWORD` are set in `.env`
2. **Installation fails silently**: Check for `--force` flag in wrapper script - without it, install stops at SSL warning
3. **Database connection errors**: Wait for MySQL to be fully ready (the wrapper script handles this, but manual commands may fail)
4. **Permission errors in volumes**: The `z` flag in volume mounts handles SELinux labeling - keep it if on RHEL/CentOS/Fedora

**Access container shell:**
```bash
# Get shell in mautic_web container
docker compose -f docker-compose.local.yaml exec mautic_web bash

# Run Mautic CLI commands
php /var/www/html/bin/console list

# Check Mautic configuration
cat /var/www/html/config/local.php

# View PHP logs
tail -f /var/log/apache2/error.log
```

**Reset and start over:**
```bash
# Nuclear option - removes everything
docker compose -f docker-compose.local.yaml down -v
rm -rf mautic_data/
docker compose -f docker-compose.local.yaml up -d
```

## Technical Details

### Custom Entrypoint Wrapper

The `docker-entrypoint-wrapper.sh` script:
- **Location**: Copied to `/docker-entrypoint-wrapper.sh` in container
- **Execution**: Set as `ENTRYPOINT` in Dockerfile, receives all CMD arguments
- **Role detection**: Only runs auto-install for `DOCKER_MAUTIC_ROLE=mautic_web` (default)
- **Idempotency**: Checks `users` table for existing data before installing
- **Error handling**: Falls back to web installer if auto-install fails
- **Database wait**: Polls MySQL with PDO connection until ready
- **Key flags**:
  - `--force` - Skips confirmation prompts (required for non-interactive install)
  - `--no-interaction` - Prevents any interactive questions
  - `-vvv` - Verbose output for debugging

### File Locations

**On host:**
- Wrapper script: `./docker-entrypoint-wrapper.sh`
- Themes: `./themes/{theme-name}/`
- Persistent data: `./mautic_data/`
- Configuration: `./mautic_data/config/local.php`

**In container:**
- Mautic root: `/var/www/html/`
- Themes: `/var/www/html/docroot/themes/`
- CLI: `/var/www/html/bin/console`
- Wrapper: `/docker-entrypoint-wrapper.sh`
- Original entrypoint: `/entrypoint.sh` (from base image)

### Important Notes

1. **The wrapper MUST use `exec`** - Final call to `/entrypoint.sh` must be `exec` to replace shell process and allow proper signal handling
2. **Database must exist** - The install command expects the database to already be created (handled by MySQL service)
3. **Migrations run after install** - Base entrypoint detects installed Mautic and runs migrations automatically
4. **Cron/Worker containers** - They use the base image without wrapper script, so they skip auto-install
5. **Volume permissions** - The `:z` suffix on volume mounts is for SELinux systems (safe on other systems)

## Common Commands

```bash
# View logs
docker compose logs -f mautic_web

# Access Mautic CLI
docker compose exec mautic_web php /var/www/html/bin/console

# Clear Mautic cache
docker compose exec mautic_web php /var/www/html/bin/console cache:clear
```

## Development Best Practices

### When Modifying Entrypoint Scripts

1. **Always test with fresh database**: Use `docker compose down -v` to ensure installation logic works from scratch
2. **Check exit codes**: The wrapper script must handle failures gracefully and fall back to web installer
3. **Use verbose flags**: Keep `-vvv` on install command for debugging during development
4. **Test both paths**: Test with and without admin credentials to verify both auto-install and web installer work
5. **Monitor logs carefully**: Installation messages are critical for debugging

### Docker Compose Files

- **`docker-compose.local.yaml`**: Standalone file for local development, includes all service definitions
- **Do not use `-f docker-compose.yaml`**: There is no base compose file, always use the full local file
- **Environment precedence**: `.env` file → defaults in compose file

### Database Access

```bash
# Connect to MySQL CLI
docker compose -f docker-compose.local.yaml exec mysql mysql -u mautic -pmauticpassword mautic

# Common queries
SELECT COUNT(*) FROM users;  -- Check if Mautic installed
SHOW TABLES;                 -- List all tables
DESCRIBE users;              -- Show users table structure
```

### Mautic CLI Reference

```bash
# List all available commands
docker compose -f docker-compose.local.yaml exec mautic_web php /var/www/html/bin/console list

# Common Mautic commands
php /var/www/html/bin/console cache:clear              # Clear cache
php /var/www/html/bin/console doctrine:migrations:list # List migrations
php /var/www/html/bin/console mautic:segments:update   # Update segments
php /var/www/html/bin/console mautic:campaigns:trigger # Trigger campaigns
```

## Adding New Themes

1. Create a new directory under `themes/` with the theme name
2. Add required files: `config.json`, `html/page.html.twig`, `html/email.html.twig`, etc.
3. Clear the Mautic cache (no rebuild needed for local development)

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

### Local Theme Development (Live Reload)

In local development, the `./themes/` directory is mounted directly into the container. Changes to theme files are reflected immediately without rebuilding.

**After adding or modifying a theme:**
```bash
# Just clear the cache - no rebuild needed
docker compose -f docker-compose.local.yaml exec mautic_web php /var/www/html/bin/console cache:clear
```

**Note:** The local mount replaces Mautic's built-in themes with only your custom themes from `./themes/`. This provides a cleaner development view.

### Production Theme Deployment

For production (Coolify), themes are baked into the Docker image at build time via the Dockerfile. Any new themes require a rebuild and redeployment.

## Environment Variables

**Coolify-managed variables:**
- `SERVICE_PASSWORD_64_MYSQLROOT` - MySQL root password
- `SERVICE_USER_MYSQL` / `SERVICE_PASSWORD_64_MYSQL` - MySQL user credentials
- `SERVICE_URL_MAUTIC_80` - Public URL for Mautic

**Auto-installation variables (optional):**
- `MAUTIC_URL` - Mautic site URL (defaults to `SERVICE_URL_MAUTIC_80`)
- `MAUTIC_ADMIN_EMAIL` - Admin email (required for auto-install)
- `MAUTIC_ADMIN_PASSWORD` - Admin password (required for auto-install)
- `MAUTIC_ADMIN_USERNAME` - Admin username (defaults to `admin`)
- `MAUTIC_ADMIN_FIRSTNAME` - Admin first name (defaults to `Admin`)
- `MAUTIC_ADMIN_LASTNAME` - Admin last name (defaults to `User`)

## Production Deployment (Coolify)

### Deployment Steps

1. **Push to repository**: Ensure all changes are committed and pushed to your git repository
2. **Configure in Coolify**:
   - Set up a new Docker Compose service
   - Point to your repository
   - Coolify will use the main `docker-compose.yaml` file (if it exists) or you can specify a custom compose file
3. **Set environment variables** in Coolify UI:
   ```
   MAUTIC_ADMIN_EMAIL=your-email@example.com
   MAUTIC_ADMIN_PASSWORD=SecurePassword123!
   ```
   Note: Coolify automatically provides `SERVICE_*` variables for MySQL and URLs

### Key Differences from Local

- **No `.env` file**: Coolify manages environment variables through its UI
- **Automatic SSL**: Coolify handles SSL certificates automatically
- **Service variables**: `SERVICE_PASSWORD_64_MYSQLROOT`, `SERVICE_USER_MYSQL`, etc. are auto-generated by Coolify
- **Public URL**: `SERVICE_URL_MAUTIC_80` is automatically set to your domain

### Verifying Production Installation

```bash
# SSH into Coolify server
ssh your-server

# Check logs (replace with your actual container name)
docker logs -f coolify-<project-name>-mautic_web-1

# Look for the same success messages:
# "[wrapper] Auto-install completed successfully!"
# "Install complete"
```

### Production Gotchas

1. **First deployment only**: Auto-install runs only on first deployment with empty database
2. **Persistent volumes**: Coolify manages volumes automatically - data persists across redeployments
3. **Password strength**: Use strong passwords in production (uppercase, lowercase, numbers, special chars)
4. **SSL URLs**: Use `https://` for `MAUTIC_URL` in production
5. **Email configuration**: Configure SMTP after installation for email functionality

### Rollback/Reset

If you need to reinstall Mautic in production:
1. Stop the service in Coolify
2. Delete the MySQL volume (this destroys all data!)
3. Redeploy the service
4. Auto-install will run again with your configured credentials
