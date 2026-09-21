# SonarQube / ESLint — Análisis eTribunal UI

> Generado: 2026-09-20
> Fuente: `npx eslint .` (configuración `eslint.config.js` del proyecto)
> **Total: 325 problemas — 298 errores | 27 warnings**

---

## Resumen ejecutivo

| Categoría | Regla | Cantidad | Prioridad |
|---|---|---|---|
| 🔴 Bug — Ref en deps de useEffect | `react-hooks/refs` | 2 | **CRÍTICA** |
| 🔴 Bug — Variable antes de declaración | `react-hooks/immutability` | 1 | **CRÍTICA** |
| 🔴 Bug — Expresión sin efecto | `@typescript-eslint/no-unused-expressions` | 3 | **ALTA** |
| 🔴 Bug — Asignación inútil | `no-useless-assignment` | 1 | **ALTA** |
| 🔴 Bug — Expresión constante en `&&` | `no-constant-binary-expression` | 1 | **ALTA** |
| 🟠 Code Smell — setState en useEffect | `react-hooks/set-state-in-effect` | 14 | **MEDIA** |
| 🟠 Code Smell — Tipo `any` explícito | `@typescript-eslint/no-explicit-any` | ~130 | **MEDIA** |
| 🟡 Code Smell — Variables no usadas | `@typescript-eslint/no-unused-vars` | ~50 | **MEDIA** |
| 🟡 Code Smell — Deps faltantes en hooks | `react-hooks/exhaustive-deps` | 17 | **MEDIA** |
| 🟡 Code Smell — Fast Refresh mixto | `react-refresh/only-export-components` | 7 | **BAJA** |

---

## 🔴 PRIORIDAD CRÍTICA — Bugs reales

### B-01 · `CaseDetail.tsx` — Ref accedida en array de dependencias

**Archivo:** `src/components/ui/CaseDetail.tsx` — Línea 147
**Regla:** `react-hooks/refs`
**Impacto:** El componente puede no re-renderizar cuando el ref cambia; comportamiento impredecible.
**Estado:** [ ] Pendiente

```tsx
// ACTUAL — commentsEndRef.current como dependencia (es una ref, no un valor)
}, [commentsEndRef.current, hasMore, isFetching, visibleComments.length, fetchOlderComments, caseData?.id]);

// CORRECCIÓN — quitar commentsEndRef.current de las deps
}, [hasMore, isFetching, visibleComments.length, fetchOlderComments, caseData?.id]);
```

**Acción:** Eliminar `commentsEndRef.current` del array de dependencias del `useEffect` en la línea 147.

---

### B-02 · `ProfilePage.tsx` — Variable `fetchProfile` usada antes de declararse

**Archivo:** `src/pages/ProfilePage.tsx` — Línea 107
**Regla:** `react-hooks/immutability`
**Impacto:** `fetchProfile` se llama dentro del `useEffect` (línea 107) pero se declara más abajo (línea 114). El closure captura el valor inicial y no se actualiza.
**Estado:** [ ] Pendiente

```tsx
// CORRECCIÓN — convertir a useCallback y moverla ANTES del useEffect
const fetchProfile = useCallback(async () => {
  // ... lógica actual
}, [targetUsername]);

useEffect(() => {
  if (targetUsername) fetchProfile();
  setSkipCreated(0);
  setSkipSaved(0);
  setSkipVoted(0);
}, [targetUsername, isOwnProfile, fetchProfile]);
```

---

### B-03 · `CaseCard.tsx` — Expresiones sin efecto (unused-expressions)

**Archivo:** `src/components/ui/CaseCard.tsx` — Líneas 266, 277, 291
**Regla:** `@typescript-eslint/no-unused-expressions`
**Impacto:** La expresión evalúa pero no hace nada — el JSX condicional no se renderiza.
**Estado:** [ ] Pendiente

```tsx
// ACTUAL — expresión suelta sin retorno/asignación
condition && someComponent;

// CORRECCIÓN — usar dentro del return como JSX condicional
{condition && <SomeComponent />}
```

---

### B-04 · `CaseCard.tsx` — Asignación a `evidenceContent` nunca usada

**Archivo:** `src/components/ui/CaseCard.tsx` — Línea 192
**Regla:** `no-useless-assignment`
**Impacto:** Dead code — la variable se asigna pero el valor nunca se consume.
**Estado:** [ ] Pendiente

**Acción:** Eliminar la variable o usarla donde corresponda en el render.

---

### B-05 · `helpers.spec.ts` — Expresión constante en `&&`

**Archivo:** `src/utils/helpers.spec.ts` — Línea 29
**Regla:** `no-constant-binary-expression`
**Impacto:** El lado izquierdo del `&&` siempre es truthy — el test nunca puede fallar por esa rama.
**Estado:** [ ] Pendiente

**Acción:** Revisar la condición y corregirla con un valor dinámico o simplificar el test.

---

## 🟠 PRIORIDAD MEDIA — setState sincrónico en useEffect (14 ocurrencias)

> El patrón `useEffect(() => { setState(x); }, [x])` es equivalente a `useDerivedState` y causa un render extra innecesario. La solución general es usar `useState` con inicializador o `useMemo`.

### E-01 · `AdminLayoutContent.tsx:35` — `setMounted(true)`

**Archivo:** `src/components/layout/AdminLayoutContent.tsx`
**Estado:** [ ] Pendiente

```tsx
// ACTUAL
useEffect(() => { setMounted(true); }, []);

// CORRECCIÓN A — si no hay SSR real, inicializar en true
const [mounted] = useState(true);

// CORRECCIÓN B — si es para evitar flash, usar ref
const mountedRef = useRef(false);
useEffect(() => { mountedRef.current = true; }, []);
```

---

### E-02 · `MainLayout.tsx:86` — `fetchActiveUsers()`

**Archivo:** `src/components/layout/MainLayout.tsx`
**Estado:** [ ] Pendiente

```tsx
// ACTUAL
useEffect(() => { fetchActiveUsers(); }, []);

// CORRECCIÓN — envolver en useCallback y agregar a deps
const fetchActiveUsers = useCallback(async () => { ... }, []);
useEffect(() => { fetchActiveUsers(); }, [fetchActiveUsers]);
```

---

### E-03 · `Comment.tsx:213` — `setShowReplies(true)`

**Archivo:** `src/components/ui/Comment.tsx`
**Estado:** [ ] Pendiente

```tsx
// ACTUAL
useEffect(() => {
  if (highlightId === comment.id && hasReplies) {
    setShowReplies(true);
  }
}, [highlightId, comment.id, hasReplies]);

// CORRECCIÓN — inicializar en useState con valor derivado
const [showReplies, setShowReplies] = useState(
  () => highlightId === comment.id && hasReplies
);
```

---

### E-04 · `LoginModal.tsx:631` — `setIsSignUp(initialIsSignUp)`

**Archivo:** `src/components/ui/LoginModal.tsx`
**Estado:** [ ] Pendiente

```tsx
// ACTUAL
useEffect(() => { setIsSignUp(initialIsSignUp); }, [initialIsSignUp]);

// CORRECCIÓN — usar key prop en el padre para resetear el componente,
// o inicializar con useState(() => initialIsSignUp) + escuchar cambios externamente
const [isSignUp, setIsSignUp] = useState(() => initialIsSignUp);
```

---

### E-05 · `ReactionBar.tsx:205,209,214` — 3 effects sincronizando props con estado

**Archivo:** `src/components/ui/ReactionBar.tsx`
**Estado:** [ ] Pendiente

```tsx
// ACTUAL — 3 effects independientes
useEffect(() => { setLocalReactions(reactions); }, [reactions]);
useEffect(() => { setLocalUserReaction(userReaction); }, [userReaction]);
useEffect(() => {
  if (localUserReaction && !justReacted) {
    setJustReacted(true);
    const timer = setTimeout(() => setJustReacted(false), 600);
    return () => clearTimeout(timer);
  }
}, [localUserReaction]);

// CORRECCIÓN — eliminar estado local duplicado y usar props directamente,
// manteniendo solo el estado de animación (justReacted)
const localReactions = reactions;            // leer prop directo
const localUserReaction = userReaction;      // leer prop directo
// Mantener solo:
const [justReacted, setJustReacted] = useState(false);
useEffect(() => {
  if (userReaction && !justReacted) {
    setJustReacted(true);
    const timer = setTimeout(() => setJustReacted(false), 600);
    return () => clearTimeout(timer);
  }
}, [userReaction]); // quitar justReacted de deps para evitar loop
```

---

### E-06 · `FeedPage.tsx:101,111` — `setActiveTab` duplicado

**Archivo:** `src/pages/FeedPage.tsx`
**Estado:** [ ] Pendiente

```tsx
// ACTUAL — 2 effects casi idénticos
// CORRECCIÓN — unificar en uno solo
useEffect(() => {
  setActiveTab(initialTab);
  setSkip(0);
}, [initialTab]);
```

---

### E-07 · `ProfilePage.tsx:109` — `setSkipCreated/Saved/Voted`

**Archivo:** `src/pages/ProfilePage.tsx`
**Estado:** [ ] Pendiente

**Acción:** Mover el reset de skips a un handler que dispara el cambio de `targetUsername`, no a un effect reactivo.

---

### E-08 · `SettingsPage.tsx:126` — `setLanguage(i18n.language)`

**Archivo:** `src/pages/SettingsPage.tsx`
**Estado:** [ ] Pendiente

```tsx
// ACTUAL
useEffect(() => {
  if (i18n.language) setLanguage(i18n.language);
}, [i18n.language]);

// CORRECCIÓN
const [language, setLanguage] = useState(() => i18n.language ?? 'es');
// Si se necesita reactivo a cambios externos de i18n, usar su evento:
useEffect(() => {
  const handler = (lng: string) => setLanguage(lng);
  i18n.on('languageChanged', handler);
  return () => i18n.off('languageChanged', handler);
}, [i18n]);
```

---

## 🟡 PRIORIDAD MEDIA — Variables/parámetros no utilizados (~50 ocurrencias)

### Props de componentes sin usar (candidatos a eliminar de la interfaz)

| Archivo | Variables sin usar | Acción |
|---|---|---|
| `src/components/ui/CaseDetail.tsx` | `onShare`, `onClose`, `onToggleSave`, `isSaving`, `reactions`, `userReaction`, `nextCursor` | Eliminar de props o implementar |
| `src/components/ui/CaseCard.tsx` | `isShared`, `onToggleShare`, `isSharingThis` | Eliminar de props o implementar |
| `src/components/ui/ReactionBar.tsx` | `onReactionClick` | Eliminar de props o usar |
| `src/components/ui/Comment.tsx` | `isTop`, `onShare` | Eliminar de props o usar |
| `src/components/layout/Sidebar.tsx` | `onProfileClick`, `userAvatar` | Eliminar de props o usar |
| `src/components/layout/AdminLayout.tsx` | `getTitleKey` | Eliminar función |
| `src/components/layout/AdminSidebar.tsx` | `STORAGE_KEY` | Eliminar constante |
| `src/components/layout/TrendingSidebar.tsx` | `i` (índice en `.map`) | Usar `_i` o reescribir |
| `src/components/ui/CommentThread.tsx` | `currentUser` | Eliminar de props o usar |
| `src/redux/slices/authSlice.ts` | `error` (en catch) | Usar `_error` o loguear |
| `src/redux/services/casesApi.ts` | `_meta`, `args` | Usar prefijo `_` |
| `src/routing/AppRoutes.tsx` | `RoleGate` (import) | Eliminar import |
| `src/api/client.ts:313` | `endpoint`, `method` (en fn error) | Eliminar params o usar |
| `src/components/ui/CaseDetail.tsx:930` | `e` (catch) | Usar `_e` o `unknown` |

### Variables en tests sin usar

| Archivo | Variables | Acción |
|---|---|---|
| `src/components/ui/CaseCard.spec.tsx` | `within` | Eliminar import |
| `src/components/ui/Comment.spec.tsx` | `reactions` | Eliminar |
| `src/components/ui/ReactionBar.spec.tsx` | `whileHover`, `whileTap`, `animate`, `initial`, `transition`, `container` | Limpiar mocks |
| `src/redux/slices/authSlice.spec.ts` | `profileUser` | Eliminar |

---

## 🟡 PRIORIDAD MEDIA — Tipo `any` explícito en producción (~80 ocurrencias)

### Estrategia de tipado por área

#### `src/api/client.ts` — Interceptors Axios

```tsx
// ACTUAL
(config: any, headers: any) => ...

// CORRECCIÓN
import type { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
(config: InternalAxiosRequestConfig) => ...
```

#### `src/services/mappers/caseMapper.ts` — DTOs de API

```tsx
// ACTUAL
function mapCase(raw: any) { ... }

// CORRECCIÓN — crear interface de DTO
interface CaseApiDto {
  id: string;
  title: string;
  // ... campos del API
}
function mapCase(raw: CaseApiDto): Case { ... }
```

#### `src/redux/slices/authSlice.ts` — Redux Toolkit payloads

```tsx
// ACTUAL
builder.addCase(loginUser.fulfilled, (state, action: PayloadAction<any>) => ...

// CORRECCIÓN
interface AuthPayload { user: User; token: string; }
builder.addCase(loginUser.fulfilled, (state, action: PayloadAction<AuthPayload>) => ...
```

#### Bloques `catch` — patrón consistente

```tsx
// ACTUAL
} catch (e: any) { setError(e.message); }

// CORRECCIÓN
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : 'Error desconocido';
  setError(msg);
}
```

#### Event handlers en JSX

```tsx
// ACTUAL
onChange={(e: any) => setValue(e.target.value)}

// CORRECCIÓN
onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
```

---

## 🟡 PRIORIDAD MEDIA — Dependencias faltantes en hooks (17 ocurrencias)

| Archivo | Línea | Dep faltante | Riesgo | Corrección |
|---|---|---|---|---|
| `MainLayout.tsx` | 83 | `fetchUnreadCount` | Closure stale | Envolver en `useCallback` |
| `CaseDetail.tsx` | 147 | `caseData` | Closure stale | Agregar a deps |
| `EditCaseModal.tsx` | 71 | `onKeepChange` | Closure stale | Agregar a deps o `useCallback` en padre |
| `ForgotPasswordForm.tsx` | 83 | `handleBack` | Closure stale | `useCallback` |
| `FeedPage.tsx` | 178 | `openAuthModal` | Stale callback | `useCallback` en proveedor |
| `FeedPage.tsx` | 196 | `openAuthModal`, `showToast` | Stale callback | `useCallback` en proveedor |
| `FeedPage.tsx` | 210 | `openAuthModal`, `showToast` | Stale callback | `useCallback` en proveedor |
| `FeedPage.tsx` | 221 | `showToast` | Stale callback | `useCallback` en proveedor |
| `FeedPage.tsx` | 236 | `openAuthModal`, `showToast` | Stale callback | `useCallback` en proveedor |
| `ProfilePage.tsx` | 90–92 | Arrays derived | Re-renders | `useMemo` para arrays |
| `ProfilePage.tsx` | 112 | `fetchProfile` | Closure stale | `useCallback` |
| `SearchPage.tsx` | 36 | `searchParams` | Closure stale | Agregar a deps |
| `VerifyEmailPage.tsx` | 44 | `navigate` | Closure stale | Agregar (es estable en RR v6) |
| `ReactionBar.tsx` | 218 | `justReacted` | Lógica incorrecta | Agregar a deps o usar ref |

---

## 🟡 PRIORIDAD BAJA — Fast Refresh: exports mixtos (7 ocurrencias)

| Archivo | Problema | Corrección |
|---|---|---|
| `src/shared/components/ReactionIcon.tsx` | Exporta constantes + componente | Mover constantes a `reactionIcons.ts` |
| `src/shared/components/Toast.tsx` | Exporta función + componente | Mover helpers a `toastHelpers.ts` |
| `src/pages/InvitePage.tsx` | Exporta constantes junto al componente | Mover constantes a archivo separado |

---

## 🟡 PRIORIDAD BAJA — Coverage en eslint scope (6 warnings)

Agregar `coverage/` al ignore de ESLint:

```js
// eslint.config.js
export default defineConfig([
  globalIgnores(['dist', 'coverage']),  // agregar 'coverage'
  // ...
])
```

---

## Plan de corrección — Orden de ejecución

| Fase | Issues | Archivos clave | Estado |
|---|---|---|---|
| **Fase 1** — Bugs críticos | B-01 a B-05 | `CaseDetail`, `ProfilePage`, `CaseCard`, `helpers.spec` | [ ] |
| **Fase 2** — setState en effects | E-01 a E-08 | 8 archivos | [ ] |
| **Fase 3** — Unused vars (prod) | ~25 en prod | `CaseDetail`, `CaseCard`, `Sidebar`, etc. | [ ] |
| **Fase 4** — any en prod | ~80 en prod | `client.ts`, `authSlice`, `mappers`, pages | [ ] |
| **Fase 5** — Exhaustive deps | 17 | Varios | [ ] |
| **Fase 6** — any en tests | ~50 en tests | `*.spec.ts` | [ ] |
| **Fase 7** — Unused vars tests | ~20 en tests | `*.spec.tsx` | [ ] |
| **Fase 8** — Fast Refresh | 7 | `ReactionIcon`, `Toast`, `InvitePage` | [ ] |
| **Fase 9** — Coverage ignore | 6 | `eslint.config.js` | [ ] |

---

## Notas sobre falsos positivos

- **`react-hooks/set-state-in-effect`** en `setMounted(true)` — puede ser intencional para patrones anti-SSR-flash. Evaluar caso por caso.
- **`no-unused-vars` en rest spread** — si se usa `const { unwanted, ...rest } = props` para excluir, usar prefijo `_unwanted`.
- **`exhaustive-deps` con `navigate`** — React Router v6+ garantiza referencia estable; agregar a deps es correcto y no causa loops.
- **`react-hooks/set-state-in-effect` en `LoginModal.tsx:631`** — el patrón `useEffect([prop]) → setState` es legítimo para "controlled/uncontrolled" sync. Considerar reescribir el componente como completamente controlled usando `key` prop.

---

*Documento generado automáticamente. Actualizar checkboxes después de cada fase completada y re-ejecutar `pnpm run sonar` para verificar reducción de issues.*

