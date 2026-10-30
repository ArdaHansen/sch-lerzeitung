FROM php:8.3-apache

RUN sed -ri 's/^Listen 80$/Listen 10000/' /etc/apache2/ports.conf \
    && sed -ri 's/<VirtualHost \*:80>/<VirtualHost *:10000>/' /etc/apache2/sites-available/000-default.conf \
    && printf '<Directory /var/www/html/data>\n    Require all denied\n</Directory>\n' > /etc/apache2/conf-available/deny-data.conf \
    && a2enconf deny-data

WORKDIR /var/www/html
COPY --chown=www-data:www-data api.php app.js index.html router.php styles.css ./
COPY --chown=www-data:www-data data/ ./data/
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 10000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]