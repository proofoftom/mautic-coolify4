#!/bin/bash
set -e

echo "[wrapper] Starting Mautic with auto-install support..."

# Only run auto-install for web role (default)
ROLE="${DOCKER_MAUTIC_ROLE:-mautic_web}"
if [ "$ROLE" != "mautic_web" ]; then
    echo "[wrapper] Role is $ROLE, skipping auto-install"
    exec /entrypoint.sh "$@"
fi

# Skip if no admin credentials provided
if [ -z "$MAUTIC_ADMIN_EMAIL" ] || [ -z "$MAUTIC_ADMIN_PASSWORD" ]; then
    echo "[wrapper] No admin credentials, using default installer"
    exec /entrypoint.sh "$@"
fi

# Wait for MySQL to be ready
echo "[wrapper] Waiting for MySQL..."
until php -r "new PDO('mysql:host=$MAUTIC_DB_HOST;port=${MAUTIC_DB_PORT:-3306}', '$MAUTIC_DB_USER', '$MAUTIC_DB_PASSWORD');" 2>/dev/null; do
    sleep 2
done
echo "[wrapper] MySQL is ready"

# Check if already installed (users table exists and has data)
check_installed() {
    php -r "
        try {
            \$pdo = new PDO(
                'mysql:host=$MAUTIC_DB_HOST;port=${MAUTIC_DB_PORT:-3306};dbname=$MAUTIC_DB_DATABASE',
                '$MAUTIC_DB_USER',
                '$MAUTIC_DB_PASSWORD'
            );
            \$stmt = \$pdo->query('SELECT COUNT(*) FROM users');
            exit(\$stmt && \$stmt->fetchColumn() > 0 ? 0 : 1);
        } catch (Exception \$e) {
            exit(1);
        }
    " 2>/dev/null
}

if check_installed; then
    echo "[wrapper] Mautic already installed, skipping auto-install"
    exec /entrypoint.sh "$@"
fi

# Run installation
echo "[wrapper] Running Mautic auto-install..."
SITE_URL="${MAUTIC_URL:-${SERVICE_URL_MAUTIC_80:-http://localhost}}"

# Run install command with --force to skip confirmation prompts
set +e  # Temporarily disable exit on error to check exit code
php /var/www/html/bin/console mautic:install "$SITE_URL" \
    --force \
    --db_host="$MAUTIC_DB_HOST" \
    --db_port="${MAUTIC_DB_PORT:-3306}" \
    --db_name="$MAUTIC_DB_DATABASE" \
    --db_user="$MAUTIC_DB_USER" \
    --db_password="$MAUTIC_DB_PASSWORD" \
    --admin_email="$MAUTIC_ADMIN_EMAIL" \
    --admin_password="$MAUTIC_ADMIN_PASSWORD" \
    --admin_username="${MAUTIC_ADMIN_USERNAME:-admin}" \
    --admin_firstname="${MAUTIC_ADMIN_FIRSTNAME:-Admin}" \
    --admin_lastname="${MAUTIC_ADMIN_LASTNAME:-User}" \
    --no-interaction \
    -vvv

INSTALL_EXIT_CODE=$?
set -e  # Re-enable exit on error

if [ $INSTALL_EXIT_CODE -ne 0 ]; then
    echo "[wrapper] ERROR: Mautic installation failed with exit code $INSTALL_EXIT_CODE"
    echo "[wrapper] Falling back to web installer..."
    exec /entrypoint.sh "$@"
fi

# Verify installation was successful
if check_installed; then
    echo "[wrapper] Auto-install completed successfully!"
else
    echo "[wrapper] WARNING: Install command completed but Mautic not detected as installed"
    echo "[wrapper] You may need to complete installation via web installer"
fi

# Continue with original entrypoint
exec /entrypoint.sh "$@"
