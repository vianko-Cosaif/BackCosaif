# Guia Normalizada de Banner v7

Esta guia define el contrato comun para:

1. `ApiSistemas <-> ViankoSystems`
2. `BackCosaif <-> CosaifWeb`

El objetivo es que creador, backend y frontend compartan las mismas reglas.

## 1) Payload canonico recomendado

```json
{
  "version": "multi-banner-v1",
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
    "layers": []
  },
  "banners": [
    { "id": "banner-1", "layers": [] },
    { "id": "banner-2", "layers": [] }
  ]
}
```

## 2) Reglas de transicion de banners

La rotacion automatica solo ocurre si se cumple todo:

1. `bannerTools.mode = "auto"`
2. `bannerTools.autoplay = true`
3. `banners.length >= 2`

Si `banners.length < 2`, no hay cambio de banner (comportamiento correcto).

## 3) `bannerTools` (raiz)

| Campo | Tipo | Default recomendado | Notas |
|---|---|---|---|
| `mode` | `"manual" \| "auto"` | `"auto"` | `manual` deshabilita autoplay |
| `autoplay` | `boolean` | `true` | Aplica solo en modo `auto` |
| `intervalMs` | `number` | `6000` | Minimo recomendado: `1000` |
| `transition` | `"fade" \| "slide" \| "zoom" \| "none"` | `"fade"` | Transicion al cambiar banner |

## 4) Campos de `banner`

Campos clave:

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
3. Para responsividad estable, siempre exportar `designWidth` y `designHeight`.

## 5) Tipos de capa soportados

`background | canvas | image | text | animated | lottie | particles | group | components`

## 6) Assets

Rutas relativas soportadas:

1. `/banner/assets/<archivo>`
2. `/dashboard/banner/assets/<archivo>`

Recomendacion:

1. Usar `/banner/assets/<archivo>` como ruta unificada en JSON.
2. Mantener nombres de archivo finales iguales entre disco y JSON.

## 7) Wrappers aceptados por parser

1. `{ "banner": { ... } }`
2. `{ "data": { "banner": { ... }, "banners": [...] } }`
3. `{ "banners": [ { ... } ] }`
4. `{ "banners": [ { "banner": { ... } } ] }` (wrapper por item)
5. `{ "layers": [...] }` (legacy single banner)

## 8) Reglas de calidad para el creador

1. Exportar un unico `dashboard-banner.json` + assets usados.
2. No exportar JSONs auxiliares si no son consumidos por el frontend.
3. Si `mode=auto` y `autoplay=true`, validar al menos 2 banners antes de exportar.
4. Mantener sincronizados `src/value/image/source` con nombres reales de assets.

## 9) Checklist de validacion

1. `banners.length >= 2` cuando hay autoplay.
2. `bannerTools.intervalMs >= 1000`.
3. `transition` dentro de `fade|slide|zoom|none`.
4. Cada capa tiene `type` valido.
5. Capas `image` con `src` o `value`.
6. Capas `animated` con `assetType` + contenido valido.
7. `background` consistente (sin conflicto entre `background` y `styles.background`).
8. Assets existentes en `data/` y rutas coinciden con el JSON.

## 10) Esquema oficial

Validar contra:

1. `data/dashboard-banner.contract.schema.json`

Si el JSON pasa schema + checklist, el despliegue de transiciones es determinista.
