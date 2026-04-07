# Guia Normalizada de Banner v8 (Role Aware)

Esta guia define el contrato comun para:

1. `ApiSistemas <-> ViankoSystems`
2. `BackCosaif <-> CosaifWeb`

El objetivo es que creador, backend y frontend compartan exactamente las mismas reglas de exportacion y lectura.

## 1) Payload canonico recomendado

```json
{
  "version": "multi-banner-v2-role-aware",
  "exportedAt": "2026-03-18T12:00:00.000Z",
  "activeBannerId": "banner-1",
  "bannerTools": {
    "mode": "auto",
    "autoplay": true,
    "intervalMs": 6000,
    "transition": "fade"
  },
  "banner": {
    "id": "banner-1",
    "width": "100%",
    "height": "220px",
    "designWidth": 800,
    "designHeight": 220,
    "aspectRatio": 3.6363636,
    "background": {
      "type": "image",
      "bgType": "image",
      "value": "/banner/assets/fondo.webp",
      "image": "/banner/assets/fondo.webp"
    },
    "styles": {
      "position": "relative",
      "overflow": "hidden"
    },
    "nativeStyles": {
      "overflow": "hidden"
    },
    "visibleFor": ["ADMIN", "GERENTE", "SUPERVISOR", "EMPLEADO"],
    "layers": []
  },
  "banners": [
    { "id": "banner-1", "visibleFor": ["ADMIN"], "layers": [] },
    { "id": "banner-2", "visibleFor": ["SUPERVISOR", "CLIENTE"], "layers": [] }
  ]
}
```

## 2) Reglas de visibilidad por rol

Campo canonico recomendado para el creador:

1. `visibleFor: string[]`

Aliases aceptados por backend/frontend (compatibilidad):

1. `roles`
2. `userTypes`
3. `targetRoles`
4. `audience.roles`
5. `meta.visibleFor`
6. `meta.roles`
7. `permissions.roles`
8. `access.roles`

Roles soportados por contrato:

1. `ADMIN`
2. `ADMINISTRADOR` (alias de `ADMIN`)
3. `GERENTE`
4. `GERENCIA` (alias de `GERENTE`)
5. `SUPERVISOR`
6. `EMPLEADO`
7. `RH`
8. `COORDINADOR`
9. `CLIENTE`

Regla funcional:

1. Si un banner no define roles, se considera visible para todos.

## 3) Reglas de transicion de banners

La rotacion automatica solo ocurre si se cumple todo:

1. `bannerTools.mode = "auto"`
2. `bannerTools.autoplay = true`
3. `banners.length >= 2`

Si `banners.length < 2`, no hay cambio de banner (comportamiento esperado).

## 4) Campos base de `banner`

Campos clave para render estable y responsivo:

1. `id`
2. `width`
3. `height`
4. `designWidth`
5. `designHeight`
6. `aspectRatio`
7. `background`
8. `styles`
9. `nativeStyles`
10. `layers`

Notas:

1. `layers` es la ruta activa de render.
2. `elements` se considera legacy.
3. Para escalado consistente, siempre exportar `designWidth` y `designHeight`.

## 5) Assets y nombres de archivo

Rutas relativas soportadas:

1. `/banner/assets/<archivo>`
2. `/dashboard/banner/assets/<archivo>`

Recomendacion de normalizacion:

1. Usar `/banner/assets/<archivo>` como ruta unificada en JSON.
2. Los campos `src`, `value`, `image` y `source` deben apuntar al nombre final real del asset guardado.
3. No generar `manifest` auxiliar si no es consumido por el frontend.

## 6) Wrappers aceptados por parser

1. `{ "banner": { ... } }`
2. `{ "data": { "banner": { ... }, "banners": [...] } }`
3. `{ "banners": [ { ... } ] }`
4. `{ "banners": [ { "banner": { ... } } ] }` (wrapper por item)
5. `{ "layers": [...] }` (legacy single banner)

## 7) Checklist de validacion para el creador

1. `banners.length >= 2` cuando hay autoplay.
2. `bannerTools.intervalMs >= 1000`.
3. `transition` dentro de `fade|slide|zoom|none`.
4. Cada capa tiene `type` valido.
5. Capas `image` con `src` o `value`.
6. Capas `animated` con `assetType` + contenido valido.
7. `background` consistente (sin conflicto entre `background` y `styles.background`).
8. Assets existentes en `data/` y rutas iguales a los nombres reales exportados.
9. Si hay roles, usar preferentemente `visibleFor` como campo principal.

## 8) Esquema oficial

Validar contra:

1. `data/dashboard-banner.contract.schema.json`

Si el JSON pasa schema + checklist, el despliegue es determinista en web y native.
