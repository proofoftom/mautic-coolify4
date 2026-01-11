FROM mautic/mautic:latest

COPY ./themes/ /var/www/html/docroot/themes/

# Fix for GrapesJS Builder head content duplication bug
# See: https://github.com/mautic/mautic/issues/XXXXX
COPY ./patches/plugins/GrapesJsBuilderBundle/Assets/library/js/dist/ /var/www/html/docroot/plugins/GrapesJsBuilderBundle/Assets/library/js/dist/

COPY ./docker-entrypoint-wrapper.sh /docker-entrypoint-wrapper.sh
RUN chmod +x /docker-entrypoint-wrapper.sh

ENTRYPOINT ["/docker-entrypoint-wrapper.sh"]