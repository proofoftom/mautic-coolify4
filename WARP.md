# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Mautic deployment configuration for Coolify with:
- Docker Compose setup for running Mautic with MySQL and RabbitMQ
- Custom auto-installation wrapper script that eliminates manual web installer
- Custom Mautic themes (GrapesJS builder format)

## Architecture

### Docker Services
- **mysql** - MySQL 8.0 database backend
- **rabbitmq** - Message queue for async processing (emails, hits)
- **mautic_web** - Main Mautic web application (custom image with themes and auto-install wrapper)
- **mautic_cron** - Cron job runner for scheduled tasks
- **mautic_worker** - Message queue consumer

### Custom Entrypoint Wrapper
The `docker-entrypoint-wrapper.sh` wraps the base Mautic entrypoint to provide auto-installation:
- Runs only for `DOCKER_MAUTIC_ROLE=mautic_web` (default role)
- Waits for MySQL to be ready using PDO connection checks
- Checks if Mautic is already installed by querying users table
- If `MAUTIC_ADMIN_EMAIL` and `MAUTIC_ADMIN_PASSWORD` are set, runs `mautic:install` command automatically
- Falls back to web installer if auto-install fails or credentials not provided
- MUST use `exec` for final `/entrypoint.sh` call to allow proper signal handling

**Key implementation details:**
- `--force` flag is required to skip SSL confirmation prompts in non-interactive mode
- Installation is idempotent - checks existing data before running
- Base entrypoint handles migrations automatically after install

### Theme Structure
Mautic themes follow GrapesJS builder format:
- `config.json` - Theme metadata (name, author, builder type, features)
- `html/*.html.twig` - Twig templates for pages, emails, forms, messages
- `assets/css/` - Stylesheets
- `assets/js/` - JavaScript files

### File Locations
**Host:**
- Wrapper script: `./docker-entrypoint-wrapper.sh`
- Custom themes: `./themes/{theme-name}/`
- Persistent data: `./mautic_data/`

**Container:**
- Mautic root: `/var/www/html/`
- Themes: `/var/www/html/docroot/themes/`
- CLI: `/var/www/html/bin/console`
- Wrapper: `/docker-entrypoint-wrapper.sh`
- Base entrypoint: `/entrypoint.sh`

## Common Commands

### Initial Setup
```bash
# Copy environment template
cp .env.example .env

# Edit credentials (optional - defaults work for local dev)
# nano .env

# Start all services with auto-install
docker compose -f docker-compose.local.yaml up -d

# Watch installation progress
docker compose -f docker-compose.local.yaml logs -f mautic_web
```

### Development Workflow

**After modifying wrapper script:**
```bash
# Destroy all data and rebuild (DESTRUCTIVE!)
docker compose -f docker-compose.local.yaml down -v
rm -rf mautic_data/
docker compose -f docker-compose.local.yaml build mautic_web
docker compose -f docker-compose.local.yaml up -d
docker compose -f docker-compose.local.yaml logs -f mautic_web
```

**After modifying themes:**
```bash
# Themes are live-mounted in local dev - just clear cache
docker compose -f docker-compose.local.yaml exec mautic_web php /var/www/html/bin/console cache:clear
```

**After modifying docker-compose or environment variables:**
```bash
docker compose -f docker-compose.local.yaml up -d
# Or restart everything:
docker compose -f docker-compose.local.yaml restart
```

### Mautic CLI Commands
```bash
# Access Mautic CLI
docker compose -f docker-compose.local.yaml exec mautic_web php /var/www/html/bin/console

# List all available commands
docker compose -f docker-compose.local.yaml exec mautic_web php /var/www/html/bin/console list

# Clear cache
docker compose -f docker-compose.local.yaml exec mautic_web php /var/www/html/bin/console cache:clear

# List migrations
docker compose -f docker-compose.local.yaml exec mautic_web php /var/www/html/bin/console doctrine:migrations:list

# Update segments
docker compose -f docker-compose.local.yaml exec mautic_web php /var/www/html/bin/console mautic:segments:update

# Trigger campaigns
docker compose -f docker-compose.local.yaml exec mautic_web php /var/www/html/bin/console mautic:campaigns:trigger
```

### Debugging
```bash
# View logs
docker compose -f docker-compose.local.yaml logs -f mautic_web

# Access container shell
docker compose -f docker-compose.local.yaml exec mautic_web bash

# Check Mautic configuration
docker compose -f docker-compose.local.yaml exec mautic_web cat /var/www/html/config/local.php

# Check PHP logs
docker compose -f docker-compose.local.yaml exec mautic_web tail -f /var/log/apache2/error.log

# Verify installation completed
curl -I http://localhost:8080/s/login

# Check database for users
docker compose -f docker-compose.local.yaml exec mysql mysql -u mautic -pmauticpassword mautic -e "SELECT id, username, email FROM users;"
```

### Database Access
```bash
# Connect to MySQL CLI
docker compose -f docker-compose.local.yaml exec mysql mysql -u mautic -pmauticpassword mautic

# Common queries:
# SELECT COUNT(*) FROM users;  -- Check if Mautic installed
# SHOW TABLES;                 -- List all tables
# DESCRIBE users;              -- Show users table structure
```

### Running Tests
```bash
# Run all tests
./tests/run-tests.sh

# Run specific test file
bats tests/wrapper.bats
bats tests/theme.bats

# Run tests matching pattern
./tests/run-tests.sh -f "MySQL"

# Run with verbose output
./tests/run-tests.sh -v

# Run tests in parallel
./tests/run-tests.sh -j 4
```

**Prerequisites:** Install BATS and jq
```bash
# macOS
brew install bats-core jq

# Ubuntu/Debian
sudo apt-get install bats jq
```

See `tests/README.md` for detailed test documentation.

## Environment Variables

### Coolify-Managed (Production)
- `SERVICE_PASSWORD_64_MYSQLROOT` - MySQL root password
- `SERVICE_USER_MYSQL` / `SERVICE_PASSWORD_64_MYSQL` - MySQL user credentials
- `SERVICE_URL_MAUTIC_80` - Public URL for Mautic

### Auto-Installation Variables (Optional)
Required for automatic installation:
- `MAUTIC_ADMIN_EMAIL` - Admin email (must be set with password for auto-install to run)
- `MAUTIC_ADMIN_PASSWORD` - Admin password (requires: uppercase, lowercase, number, special char)

Optional (have defaults):
- `MAUTIC_URL` - Mautic site URL (defaults to `SERVICE_URL_MAUTIC_80`)
- `MAUTIC_ADMIN_USERNAME` - Admin username (defaults to `admin`)
- `MAUTIC_ADMIN_FIRSTNAME` - Admin first name (defaults to `Admin`)
- `MAUTIC_ADMIN_LASTNAME` - Admin last name (defaults to `User`)

**To use web installer instead:** Leave `MAUTIC_ADMIN_EMAIL` and `MAUTIC_ADMIN_PASSWORD` empty in `.env`

## Docker Compose Files

- **`docker-compose.local.yaml`** - Standalone file for local development with all service definitions
  - Includes port mapping (`8080:80`)
  - Live-mounts `./themes/` directory for theme development
  - Auto-loads `.env` file
- **`docker-compose.yaml`** - Base compose file for production (Coolify)
  - No ports exposed (Coolify handles routing)
  - Themes baked into image at build time
  - Uses relative volume paths for Coolify compatibility

**Always use:** `docker compose -f docker-compose.local.yaml` for local development

## Theme Development

### Local Development (Live Reload)
In local dev, `./themes/` is mounted directly into container. Changes are reflected immediately:

```bash
# After adding/modifying a theme, just clear cache
docker compose -f docker-compose.local.yaml exec mautic_web php /var/www/html/bin/console cache:clear
```

**Note:** Local mount replaces Mautic's built-in themes with only your custom themes from `./themes/`

### Adding New Themes
1. Create directory: `themes/{theme-name}/`
2. Add `config.json` with theme metadata:
```json
{
  "name": "Theme Name",
  "author": "Author",
  "authorUrl": "https://example.com",
  "builder": ["grapesjsbuilder"],
  "features": ["page", "email", "form"]
}
```
3. Add template files in `html/` subdirectory (*.html.twig)
4. Add assets in `assets/css/` and `assets/js/`
5. Clear cache (no rebuild needed for local dev)

### Production Theme Deployment
For production (Coolify), themes are baked into Docker image at build time via Dockerfile. New themes require rebuild and redeployment.

## Troubleshooting

### Auto-Install Not Running
- Verify `MAUTIC_ADMIN_EMAIL` and `MAUTIC_ADMIN_PASSWORD` are set in `.env`
- Check logs for "No admin credentials, using default installer" message

### Installation Fails Silently
- Check for `--force` flag in wrapper script - without it, install stops at SSL warning
- View verbose output in logs (wrapper uses `-vvv` flag)

### Database Connection Errors
- Wait for MySQL to be fully ready (wrapper script handles this automatically)
- Check healthcheck status: `docker compose -f docker-compose.local.yaml ps`

### Key Log Messages to Look For
```
[wrapper] Running Mautic auto-install...
1 - Creating database...
2 - Creating admin user...
[wrapper] Auto-install completed successfully!
```

## Important Notes

- Local development uses port 8080: http://localhost:8080
- Password requirements: Mautic 5.1+ requires complex passwords (uppercase, lowercase, number, special character)
- Auto-installation runs only once on first deployment with empty database
- Cron and Worker containers use base image without wrapper, so they skip auto-install
- Volume `:z` suffix is for SELinux systems (safe on other systems, leave it)
- Never commit `.env` file (in `.gitignore`)

## Production Deployment (Coolify)

1. Push changes to git repository
2. Configure Docker Compose service in Coolify
3. Set environment variables in Coolify UI:
   - `MAUTIC_ADMIN_EMAIL=your-email@example.com`
   - `MAUTIC_ADMIN_PASSWORD=SecurePassword123!`
   - Coolify auto-provides `SERVICE_*` variables
4. Coolify handles SSL certificates and public URL automatically
5. Monitor logs for auto-install success messages

**To reinstall in production:**
1. Stop service in Coolify
2. Delete MySQL volume (DESTROYS ALL DATA!)
3. Redeploy service
4. Auto-install runs again with configured credentials
