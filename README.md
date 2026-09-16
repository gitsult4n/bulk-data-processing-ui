# Bulk Data Processing UI

Simple React frontend for the [bulk-data-processing-platform](https://github.com/gitsult4n/bulk-data-processing-platform) API.

Features: register and log in, upload CSV or Excel customer files, start, watch live progress, cancel, retry (admin), download the error report, browse the audit log (admin).

Colors: green means success or completed, red means failure or error, amber is running, blue is queued, gray is uploaded.

## Run

1. Start the API with the `http` launch profile so it listens on `http://localhost:5276`:

   ```bash
   cd ../bulk-data-processing-platform
   dotnet run --launch-profile http
   ```

2. Install and start the UI:

   ```bash
   npm install
   npm run dev
   ```

3. Open <http://localhost:5173>.

The Vite dev server proxies `/api` to the API, so no CORS setup is needed. Point it somewhere else with `API_URL=http://host:port npm run dev`.

## Admin

Every registered account is a normal user. Promote one in the database, then log in again:

```sql
UPDATE "Users" SET "Role" = 1 WHERE "Username" = 'admin';
```

Admins see every job with its owner, can retry failed or cancelled jobs, and get the Audit page.

## Build

```bash
npm run build
npm run preview
```

`npm run build` type-checks with `tsc` and bundles into `dist/`. `npm run preview` serves the bundle with the same `/api` proxy.
