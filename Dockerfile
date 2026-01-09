FROM mautic/mautic:latest

COPY ./themes/ /var/www/html/docroot/themes/
COPY ./docker-entrypoint-wrapper.sh /docker-entrypoint-wrapper.sh
RUN chmod +x /docker-entrypoint-wrapper.sh

ENTRYPOINT ["/docker-entrypoint-wrapper.sh"]