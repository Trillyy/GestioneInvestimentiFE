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

Two env variables per environment (`local` / `prod`), all optional (defaults are in `src/api/client.ts`):

```
VITE_API_BASE_URL_LOCAL   # local backend base URL
VITE_API_BASE_URL_PROD    # production backend base URL
VITE_API_TOKEN_LOCAL      # X-API-Token for local
VITE_API_TOKEN_PROD       # X-API-Token for prod
```

The active server environment is stored in localStorage under key `gi_server` (`'local' | 'prod'`) and exposed via `ServerContext` (`src/context/ServerContext.tsx`). The Axios client reads from this context on every request. The backend is a Spring Boot app — identity is resolved from the token, no userId is sent from the frontend.

## Architecture

### Entry point & routing

`src/main.tsx` → `ServerProvider` → `RouterProvider` → `src/router/index.tsx` (React Router v7 `createBrowserRouter`).  
All pages are nested under `RootLayout` (Navbar + Outlet + Footer + Toaster). The 404 handler is a sibling route outside the layout.

Routes:

| Path | Component |
|------|-----------|
| `/` | `HomePage` — portfolio dashboard, value chart, P&L metrics |
| `/assets` | `AssetsPage` — paginated list with create sheet, type filter |
| `/assets/:id` | `AssetDetailPage` — detail with price chart and holdings card |
| `/assets/:id/holdings` | `EtfHoldingsPage` — ETF constituent holdings with parser upload |
| `/exchange-rates` | `ExchangeRatesPage` — currency pairs list, create, sync |
| `/exchange-rates/:id` | `ExchangeRateDetailPage` — rate chart for a currency pair |
| `/transactions` | `TransactionsPage` — paginated history, filters by type/portfolio |
| `/pension-funds` | `PensionFundsPage` — list of pension funds, create |
| `/pension-funds/:id` | `PensionFundDetailPage` — operations, benchmarks, NAV, holdings |

### API layer (`src/api/`)

One Axios instance in `client.ts` (`apiClient`). Domain modules each export plain async functions.

Every response is typed as `ApiResponse<T>` (`{ success, message, data, timestamp }`). Paginated responses unwrap to `PagedResponse<T>` which has `content[]` plus metadata. Call sites access `.data` (and `.data.content` for pages).

| Module | Key exports |
|--------|-------------|
| `assets.ts` | `listAssets`, `createAsset`, `getAssetDetail`, `listAllAssets`, `listSectors`, `syncPrices`, `getHoldings`, `saveHoldings` |
| `holdings.ts` | `listHoldings(portfolioId?)`, `getHoldingsByAsset(assetId)` |
| `portfolios.ts` | `listPortfolios()` |
| `transactions.ts` | `listTransactions`, `createTransaction` |
| `exchangeRates.ts` | `listCurrencyPairs`, `createCurrencyPair`, `getCurrencyPairDetail`, `syncExchangeRates` |
| `pensionFunds.ts` | `listPensionFunds`, `createPensionFund`, `getPensionFund`, `updatePensionFund`, `deletePensionFund`, `listBenchmark`, `addBenchmark`, `deleteBenchmark`, `listOperations`, `addOperation`, `deleteOperation`, `importOperations`, `listNav`, `syncNav`, `getHolding` |
| `portfolioValueHistory.ts` | `getPortfolioValueHistory(portfolioId?, from?, to?)` |

### Type system (`src/types/api.ts`)

Single file for all API types.

**Generic wrappers:** `ApiResponse<T>`, `PagedResponse<T>`

**String unions (not TS enums):**
- `AssetType`: `'STOCK' | 'ETF' | 'FUND' | 'BOND' | 'CRYPTO'`
- `TransactionType`: `'BUY' | 'SELL' | 'DIVIDEND' | 'INTEREST' | 'SPLIT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'FEE'`
- `ReplicationMethod`: `'PHYSICAL_FULL' | 'PHYSICAL_SAMPLING' | 'SYNTHETIC'`
- `DistributionType`: `'ACCUMULATING' | 'DISTRIBUTING'`
- `PriceType`: `'CLOSE' | 'OPEN' | 'ADJUSTED_CLOSE' | 'NAV'`
- `BenchmarkType`: `'EQUITY' | 'BOND' | 'COMMODITY' | 'REAL_ESTATE' | 'CASH' | 'MIXED' | 'OTHER'`
- `PensionOperationType`: `'VOLUNTARY_CONTRIBUTION' | 'COMPANY_CONTRIBUTION' | 'TFR' | 'MEMBERSHIP_FEE' | 'OTHER_CONTRIBUTION' | 'ADVANCE'`
- `PensionOperationStatus`: `'INVESTED' | 'INVESTING' | 'PAYED'`
- `CouponFrequency`: `1 | 2 | 4 | 12`

**Asset polymorphism:** `AssetResponse` has four nullable detail objects (`stockDetail`, `etfDetail`, `bondDetail`, `cryptoDetail`) — only the relevant one is populated. `AssetDetailResponse` extends this with `priceChart` and `displayCurrencyCode`.

**Portfolio value history:** `PortfolioValueHistoryDetailResponse` → `{ latestSnapshot: LatestSnapshot, series: SnapshotPoint[] }`. Each `SnapshotPoint` has `totalValue`, `totalInvested`, `unrealizedPnl`, `unrealizedPnlPct`, `realizedPnl`, `snapshotDate`.

**Pension fund types:** `PensionFundResponse`, `PensionFundBenchmarkResponse`, `PensionFundNavResponse`, `PensionFundOperationResponse`, `PensionFundHoldingResponse`, `PensionFundOperationImportResult`.

### Domain helpers (`src/helpers/`)

- **`formatters.ts`** — All number/date/percentage formatting with `it-IT` locale. Exports: `fmtNum`, `fmtCurrency`, `formatPct`, `formatSignedAmount`, `formatSignedPct`, `fmtDate`, `TODAY`, `isDateRecent()`, `pnlColorClass()`, `ChartWindow` type, `WINDOW_LABELS` record, `getWindowDates()`. Import from here, never format inline.
- **`assetTypes.ts`** — `ASSET_TYPE_LABELS`, `ASSET_TYPE_VARIANT` (badge variants), `ASSET_TYPES`; `REPLICATION_LABELS`, `REPLICATION_METHODS`; `DISTRIBUTION_LABELS`, `DISTRIBUTION_TYPES`; `COUPON_FREQ_LABELS`; `getIssuer(asset)`.
- **`transactionTypes.ts`** — `TRANSACTION_TYPE_LABELS`, `TRANSACTION_TYPE_VARIANT`, `TRANSACTION_TYPES`; `NEEDS_ASSET` (types requiring asset selection); `HAS_QTY_PRICE` (types with quantity + unit price).
- **`pensionFundTypes.ts`** — `BENCHMARK_TYPE_LABELS`, `BENCHMARK_TYPES`; `OPERATION_TYPE_LABELS`, `OPERATION_TYPES`; `OPERATION_STATUS_LABELS`, `OPERATION_STATUSES`.
- **`chartHelpers.ts`** — `buildChartData(holdings, key)` aggregates `EtfHoldingResponse[]` by sector/country into `ChartSlice[]`; `buildTypeData(benchmarks)` and `buildHedgeData(benchmarks)` aggregate `PensionFundBenchmarkResponse[]` for pie charts.

### General utilities (`src/lib/`)

- **`utils.ts`** — `cn()` combining `clsx` + `tailwind-merge`; `toNum(s)` converts a string to `number | undefined`.
- **`parsers/`** — CSV/XLSX parsers for ETF constituent data. Each implements `IssuerParser` (`{ label, parse, hint }`) with `parse(file)` returning `{ holdings, validFrom? }`.

Supported parsers: `genericParser`, `iSharesParser`, `franklinTempletonParser`, `xtrackersParser`, `amundiParser`, `spdrParser`.

### UI components (`src/components/ui/`)

Shadcn-style wrappers over `@base-ui/react`. Use `cn()` for class merging.

`badge`, `button`, `card`, `checkbox`, `combobox`, `dialog`, `form`, `info-row`, `input`, `label`, `navigation-menu`, `select`, `separator`, `sheet`, `sonner`, `table`, `tabs`, `textarea`

`InfoRow` is a label+value display primitive used in detail cards — returns `null` when value is empty/null/undefined.

`TableLoadingRows` renders a single "Caricamento…" or empty-message row inside a `<TableBody>` — use instead of inline ternaries:
```tsx
<TableBody>
  <TableLoadingRows loading={loading} empty={items.length === 0} colSpan={N} emptyMessage="..." />
  {!loading && items.map(...)}
</TableBody>
```

`PaginationControls` renders "Pagina X di Y + Precedente/Successiva" — returns `null` when `totalPages <= 1`.

### Shared hooks (`src/hooks/`)

- **`useChartWindow(onFetch, initialWindow?)`** — manages `window`, `from`/`to` custom dates, `customLoading`. `onFetch(from, to)` is called automatically for `ytd`/`alltime`/`custom` windows. Returns `{ window, setWindow, from, setFrom, to, setTo, customLoading, handleWindowChange, handleCustomSearch }`. Week/month/year are pre-loaded in the API response and do not trigger `onFetch`.

### Shared components (`src/components/`)

- **`ChartWindowPicker`** — renders the window-selector tab row plus the custom date range inputs + "Cerca" button. Used in `AssetDetailPage`, `ExchangeRateDetailPage`, and `HomePage`. Pair with `useChartWindow` for the logic.
- **`custom-line-chart`** — `CustomLineChart` wraps Recharts `LineChart`. Supports single or multiple series via `lines: LineSeriesConfig[]` (dataKey, name, color, connectNulls). Key props: `xKey`, `yAxisWidth`, `yAxisTickFormatter`, `tooltipValueFormatter`, `showLegend`, `showYear` (adds year to XAxis ticks), `computeDomain` (auto min/max with 5% padding), `domainPaddingFallback`, `emptyMessage`. Used in `AssetDetailPage`, `ExchangeRateDetailPage`, `PensionFundDetailPage`.
- **`custom-pie-chart`** — `CustomPieChart` wraps Recharts `PieChart` inside a `Card`. Exports `ChartSlice` type (`{ name, value }`). Props: `data`, `title`, `unit` (`'%'` default or `'EUR'`), `height`, `outerRadius`. Returns `null` when data is empty. Used in `EtfHoldingsPage`, `PensionFundDetailPage`.

### Page patterns

Pages manage their own state with `useState` + `useEffect`. No global state. The standard pattern:
1. Fetch on mount via `useEffect` → set `loading`, call API, set data, catch → `toast.error()`.
2. Filter/search is client-side when full list is small, or passed as query params when paginated.
3. Element count is shown below every table as `<p className="text-sm text-muted-foreground">`.
4. "Reimposta" reset button appears alongside filters when any filter is active.
5. Tables use `<TableLoadingRows>` for loading/empty states; pagination uses `<PaginationControls>`.

Chart windows (`week`/`month`/`year`) are pre-fetched in the initial detail response; `ytd`, `alltime`, and `custom` trigger a second fetch with explicit date params. Use `useChartWindow` + `ChartWindowPicker` for this pattern.

### Styling

Tailwind CSS v4 via Vite plugin (no PostCSS). CVA (`class-variance-authority`) for component variants. P&L coloring: `text-emerald-600` positive, `text-red-500` negative — always via `pnlColorClass()`. All UI text is in Italian.
