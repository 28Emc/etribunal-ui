# eTribunal-ui

Frontend React de **eTribunal**: plataforma de tribunales sociales donde la comunidad delibera, vota y comenta casos reales con dos lados (Side A / Side B).

Migrado desde el proyecto existente en veredixo.com a una arquitectura Redux + Axios con PWA.

---

## 🚀 Stack Tecnológico

| Categoría | Tecnología |
|-----------|------------|
| Framework | React 19 + Vite 8 |
| Lenguaje | TypeScript ~6.0 |
| Estado | Redux Toolkit 2 (+ adaptador `AuthContext`) |
| HTTP | Axios (interceptors: JWT + refresh automático) |
| Estilos | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Routing | react-router-dom 7 |
| i18n | i18next + react-i18next (es / en) |
| Animaciones | Motion (Framer Motion) |
| Iconos | Lucide React |
| SEO | react-helmet-async |
| PWA | vite-plugin-pwa (autoUpdate + Workbox) |
| Testing | Vitest 4 + happy-dom + Testing Library |

## ⚡ Comandos

```bash
npm install            # Instalar dependencias
npm run dev            # Desarrollo → http://localhost:3000
npm run build          # Build producción (dist/) + sitemap
npm run preview        # Servir el build localmente
npm run lint           # Type check (tsc -b)
npm run test           # Vitest en modo watch
npx vitest run         # Vitest single run (CI)
npm run test:coverage  # Cobertura (umbrales: 75% lines/functions/branches/statements)
```

> ⚠️ `npm run lint` ejecuta `tsc -b` (chequeo de tipos estricto), no ESLint.

## 🔧 Variables de Entorno

Crear un archivo `.env` en la raíz:

```env
VITE_API_URL="http://localhost:3001/api"   # URL del backend NestJS
VITE_APP_URL="http://localhost:3000"       # URL pública (SEO, shares, deep links)
VITE_ENABLE_TRANSLATIONS="true"            # Feature flag: botones de traducción (false en prod)
```

Todas tienen default razonable si se omiten.

---

## 📁 Estructura

```
src/
├── api/
│   └── client.ts              # apiClient (axios) + authStorage + refresh queue
├── components/
│   ├── layout/                # MainLayout (shell + nav), PageLayout
│   └── ui/                    # CaseCard, CaseDetail, EditCaseModal, AvatarEditModal,
│                              # ShareModal, Tooltip, Skeleton, Toast, etc.
├── context/
│   └── AuthContext.tsx        # Adaptador sobre redux/slices/authSlice (API tipo hooks)
├── hooks/                     # useVote, useReactions, useComments, useSavedCases,
│                              # useSearch, useShare, useInfiniteScroll, useCases...
├── pages/                     # Una página por ruta (lazy-loaded salvo FeedPage)
│   ├── legal/                 # Términos, Privacidad, Guidelines, About
│   ├── FeedPage.tsx           # Tabs: for_you / following / trending / top-judges
│   ├── CaseDetailPage.tsx     # Detalle + votación + comentarios + moderación
│   ├── CreateCasePage.tsx     # Crear caso classic/vote
│   ├── ProfilePage.tsx        # Perfil 3 tabs (created/saved/voted)
│   ├── SettingsPage.tsx       # Ajustes de cuenta/preferencias
│   └── ...
├── redux/
│   ├── store.ts               # ConfigureStore (devTools solo en DEV)
│   ├── hooks.ts               # useAppDispatch / useAppSelector tipados
│   └── slices/                # authSlice (activo), casesSlice/uiSlice (futuro)
├── routing/
│   └── AppRoutes.tsx          # Rutas + guards manuales + deep links
├── services/
│   ├── i18n/                  # Config i18next + es.json / en.json
│   ├── mappers/caseMapper.ts  # snake_case (DB) → camelCase (FE)
│   ├── anonymity.ts           # getDisplayName, getAnonymousAvatar
│   └── featureFlags.ts        # ENABLE_TRANSLATIONS vía VITE_ENABLE_TRANSLATIONS
├── shared/                    # SEO component, hooks compartidos
├── types/index.ts             # Interfaces globales (User, Case, CaseComment...)
└── utils/helpers.ts           # cn, formatNumber, calculateVotePercentages,
                               # safeJsonParse, sanitizeImageUrl, getCasePath, createSlug
```

### Path Aliases

Configurados en `vite.config.ts` y `tsconfig`:

| Alias | Apunta a |
|-------|----------|
| `@api` | `src/api` |
| `@components` | `src/components` |
| `@layout` | `src/components/layout` |
| `@context` | `src/context` |
| `@hooks` | `src/hooks` |
| `@pages` | `src/pages` |
| `@redux` | `src/redux` |
| `@services` | `src/services` |
| `@shared` | `src/shared` |
| `@typings` | `src/types` |
| `@utils` | `src/utils` |
| `@routing` | `src/routing` |

---

## 🌐 Cliente HTTP (`api/client.ts`)

`apiClient` es una instancia de Axios con:

- **Interceptor de request**: inyecta `Authorization: Bearer <token>` automáticamente.
- **Interceptor de response**: desempaqueta `ApiResponse.data` del backend (los hooks reciben el payload directo).
- **Refresh queue**: ante `401`, renueva el access token vía `/auth/refresh`; las requests simultáneas se encolan y reintentan. Si el refresh falla → limpia sesión y redirige a `/login`.
- **`authStorage`**: helpers de sesión sobre `sessionStorage`/`localStorage` (según "Recordarme").

### Claves de almacenamiento

| Clave | Uso |
|-------|-----|
| `etribunal_access_token` / `etribunal_refresh_token` | Sesión JWT |
| `etribunal_user` | Usuario persistido |
| `etribunal_just_logged_in` | Evita refetch inmediato post-login |
| `etribunal_deep_link` | Ruta pendiente post-login (`/cases/:id`, `/users/:username`) |
| `etribunal_invite_token` | Invitación Side B pendiente |
| `etribunal_theme` | Tema dark/light |
| `etribunal_receive_notifications` | Preferencia local de notificaciones |

## 🗺️ Rutas

| Ruta | Página |
|------|--------|
| `/` | Feed (tab *Para vos*) |
| `/cases/following` · `/cases/trending` · `/top-judges` | Feed con otros tabs |
| `/cases/:id` · `/cases/:username/:slug` | Detalle de caso (URL semántica SEO) |
| `/create` | Crear caso (classic / vote) |
| `/respond/:id` | Responder como Side B |
| `/case/:token` | Aceptar invitación Side B |
| `/users/:username` | Perfil de juez |
| `/search` | Búsqueda (casos + jueces) |
| `/settings` | Configuración |
| `/login` · `/register` · `/forgot-password` · `/reset-password` · `/verify-email` | Auth |
| `/legal/terms` · `/legal/privacy` · `/legal/guidelines` · `/legal/about` | Legal |
| `/*` | Redirect a `/` |

Los guards de auth son manuales por página (no hay `ProtectedRoute` global). Las rutas (salvo FeedPage) son lazy-loaded con `<Suspense>`.

## 🌍 i18n

- Idiomas: `es` / `en` (`services/i18n/*.json`). Detección automática + preferencia del usuario persistida en el backend.
- Keys namespaced por dominio: `cases.*`, `profile.*`, `settings.*`, `search.*`, `moderator.*`, etc.
- Regla: **nunca hardcodear texto visible**; usar `t('seccion.clave')`.

## 📱 PWA

`vite-plugin-pwa` con `registerType: 'autoUpdate'`. Workbox cachea assets estáticos (precache) y usa estrategia **NetworkFirst** para llamadas `/api/` (timeout 5s). Manifest incluido (íconos 192/512).

## ✅ Testing

- **Vitest 4** + happy-dom + Testing Library (`*.spec.tsx` junto al código).
- Setup global en `src/setupTests.ts`.
- Cobertura con umbrales mínimos del 75% (`npm run test:coverage`).

```bash
npx vitest run                # toda la suite
npx vitest run src/path/x.spec.tsx   # un archivo
```

---

## 🔗 Backend

El frontend consume la API del backend (puerto 3001). Formato de respuesta estándar:

```typescript
interface ApiResponse<T> {
  data: T;
  message?: string;
  statusCode: number;
}
```

`apiClient` ya desempaqueta `.data`, por lo que los hooks trabajan directamente con `T`.

## 📝 Convenciones

- Componentes: `PascalCase.tsx`; hooks: `useCamelCase.ts`.
- Tipos globales centralizados en `@typings/index`; props tipadas en cada componente.
- El backend responde `snake_case`: usar `services/mappers/caseMapper.ts` para convertir a los modelos camelCase del frontend.
- Validar URLs externas antes de renderizarlas (`sanitizeImageUrl`) y JSON no confiable (`safeJsonParse`).
- Porcentajes de votación siempre con `calculateVotePercentages()` (garantiza suma 100%).

---

*Última actualización: 2026-08-21*
