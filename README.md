# Caruna Scraper

A simple scaping script to scrape [Carun Portal](https://portal.caruna.fi) reports.

See the docker-compose.yml for usage example (for now)

This Playwright script scrapes reports within a timerange and outputs json to `$OUTPUTDIR`. Fully configured through environment variables, which are:


```text
CARUNA_USERNAME - no default, caruna username (email)
CARUNA_PASSWORD - no default, caruna password
DEBUG_MODE - default undefined, when 'true' don't run headless
RUN_SLOWLY - default undefined, when 'true', wait for some time in between actions
OUTPUT_PATH - default $PWD/output.json - Where to output JSON data
NAVIGATION_TIMEOUT - default 5000 - TODO remove, it's the time this waits for initial page load.
```

## How do I run it?

```sh
cp .env{.default,}
mkdir outputdir
```

edit .env

```sh
docker-compose up
ls -l outputdir
```

## TODO

TODO: Docs
TODO: Influx importer (different project)
