# WIDA ON PAPER

Eine moderne Schülerzeitung mit responsivem Frontend, PHP-API und dateibasierter Beitragsablage. Es werden keine Frameworks oder Composer-Pakete benötigt.

## Lokal in Chrome starten

Installiere PHP 8.1 oder neuer und stelle sicher, dass `php` im PATH verfügbar ist. Danach `start-local.bat` doppelklicken. Die Datei startet den lokalen Server und öffnet die Seite in Google Chrome unter `http://localhost:8000`.

Der Editor ist lokal mit dem Zugangscode `2506` erreichbar. Der Code funktioniert ausschließlich über localhost. Öffne `index.html` nicht direkt als Datei, sondern starte immer `start-local.bat`.

## Hosting

Den Projektordner auf einen PHP-Webhost mit beschreibbarem `data/`-Ordner laden. Der Webserver muss PHP-Dateien ausführen können; `api.php` und `data/` dürfen nicht als Quelltext öffentlich ausgeliefert werden. Für Apache schützen die mitgelieferten `.htaccess`-Dateien die Beitragsdatei. Bei Nginx muss der Betreiber den Zugriff auf `/data/` in der Serverkonfiguration sperren.

Setze auf dem Webhost die Umgebungsvariable `WIDA_ADMIN_PASSWORD` auf ein eigenes, mindestens 16 Zeichen langes Passwort. Der lokale Code `2506` wird außerhalb von localhost nicht akzeptiert. Fünf falsche Versuche sperren die Sitzung für 15 Minuten.

## Auf Render deployen

Erstelle in Render einen neuen **Web Service** für dieses GitHub-Repository und wähle als Runtime **Docker**. Bei einem bereits als Node.js angelegten Service muss ein Docker-Web-Service erstellt werden. Lasse Root Directory, Build Command und Start Command leer; Render baut dann das `Dockerfile` im Repository. Der Container stellt Apache auf Port `10000` bereit.

Lege unter **Environment** `WIDA_ADMIN_PASSWORD` mit einem eigenen Passwort aus mindestens 16 Zeichen an. Damit Beiträge und Website-Einstellungen Deployments und Neustarts überstehen, füge unter **Disks** einen persistenten Datenträger mit Mount Path `/var/www/html/data` hinzu. Ohne diesen Datenträger sind Änderungen im `data/`-Ordner nicht dauerhaft gespeichert.

## Website bearbeiten

Oben rechts **Editor** öffnen und anmelden. Name, Überschrift, Beschreibung, Hintergrund-, Text- und Akzentfarbe sowie Textausrichtung lassen sich ohne Programmieren ändern. **Änderungen speichern** schreibt die Einstellungen in `data/settings.json`; sie bleiben nach einem Neustart erhalten. Der Serverprozess benötigt Schreibrechte für den Ordner `data/`. Für den Editor auf einem Webhost sollte die Website über HTTPS laufen.