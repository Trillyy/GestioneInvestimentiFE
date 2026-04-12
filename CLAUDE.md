# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server with HMR
npm run build      # tsc -b && vite build (type-check + bundle)
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit only
npm run preview    # Preview production build
```

No test suite is configured.

## Environment

Two env variables, both optional (defaults are in `src/api/client.ts`):

```
VITE_API_BASE_URL   # defaults to http://localhost:8080/gestioneinvestimenti
VITE_API_TOKEN      # sent as X-API-Token header on every request
```

The backend is a Spring Boot app. No userId is sent from the frontend — the server resolves identity from the token.

## Architecture

### Entry point & routing

`src/main.tsx` → `RouterProvider` → `src/router/index.tsx` (React Router v7 `createBrowserRouter`).  
All pages are nested under `RootLayout` (Navbar + Outlet + Footer + Toaster). The 404 handler is a sibling route outside the layout.

Routes: `/` (dashboard), `/assets`, `/assets/:id`, `/assets/:id/holdings` (ETF constituents), `/exchange-rates`, `/exchange-rates/:id`, `/transactions`.

### API layer (`src/api/`)

One Axios instance in `client.ts`. Domain modules (`assets.ts`, `holdings.ts`, `transactions.ts`, `portfolios.ts`, `exchangeRates.ts`) each export plain async functions.  

Every response is typed as `ApiResponse<T>` (`{ success, message, data, timestamp }`). Paginated responses unwrap to `PagedResponse<T>` which has `content[]` plus metadata. Call sites access `.data` (and `.data.content` for pages).

### Type system (`src/types/api.ts`)

Single file for all API types. Asset type polymorphism: `AssetResponse` has four nullable detail objects (`stockDetail`, `etfDetail`, `bondDetail`, `cryptoDetail`) — only the relevant one is populated. `AssetDetailResponse` extends this with price chart data and an `AssetHoldingDetail[]` for the holdings card on the detail page.

Key enums (string unions, not TS enums): `AssetType`, `TransactionType`, `ReplicationMethod`, `DistributionType`.

### Shared utilities (`src/lib/`)

- **`formatters.ts`** — All number/date/percentage formatting with `it-IT` locale. Also exports `ChartWindow` type, `WINDOW_LABELS` record, `TODAY` constant, `isDateRecent()`, and `pnlColorClass()`. Import from here rather than formatting inline.
- **`assetTypes.ts`** — `ASSET_TYPE_LABELS`, `ASSET_TYPE_VARIANT` (badge variants), `ASSET_TYPES` array. Use these everywhere to keep labels consistent.
- **`transactionTypes.ts`** — Same pattern for `TransactionType`.
- **`utils.ts`** — `cn()` combining `clsx` + `tailwind-merge`.
- **`parsers/`** — CSV/XLSX parsers for ETF constituent data from specific issuers (iShares, Amundi, Xtrackers, etc.). Each implements `IssuerParser` with a `parse(file)` method returning `{ holdings, validFrom? }`.

### UI components (`src/components/ui/`)

Shadcn-style wrappers over `@base-ui/react`. Use `cn()` for class merging. `InfoRow` is a label+value display primitive used in detail cards — it returns `null` when value is empty/null/undefined.

### Page patterns

Pages manage their own state with `useState` + `useEffect`. No global state. The standard pattern:
1. Fetch on mount via `useEffect` → set `loading`, call API, set data, catch → `toast.error()`.
2. Filter/search is client-side when full list is small, or passed as query params when paginated.
3. Element count is shown below every table as `<p className="text-sm text-muted-foreground">`.
4. "Reimposta" reset button appears alongside filters when any filter is active.

Chart windows (`week`/`month`/`year` are pre-fetched in the initial detail response; `ytd` and `custom` trigger a second fetch with explicit date params).

### Styling

Tailwind CSS v4 via Vite plugin (no PostCSS). CVA (`class-variance-authority`) for component variants. P&L coloring: `text-emerald-600` positive, `text-red-500` negative — always via `pnlColorClass()`. All UI text is in Italian.
