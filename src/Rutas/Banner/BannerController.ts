import type { Request, Response } from "express";
import fs from "fs";
import path from "path";

type StyleValue = string | number;

type BannerBackground = {
  type?: "color" | "gradient" | "image" | string;
  bgType?: "solid" | "gradient" | "image" | string;
  value?: string;
  image?: string;
};

type BannerAnimation = {
  name?: string;
  duration?: string;
  delay?: string;
  timingFunction?: string;
  iterationCount?: string | number;
  fillMode?: string;
};

type BannerElement = {
  tag?: string;
  content?: string;
  src?: string;
  alt?: string;
  className?: string;
  actionUrl?: string;
  styles?: Record<string, string | number>;
  nativeStyles?: Record<string, string | number>;
  animation?: BannerAnimation;
  children?: BannerElement[];
};

type BannerLayerType = "background" | "canvas" | "image" | "text" | "animated" | "lottie" | "particles";
type BannerLayer = {
  id?: string;
  type?: BannerLayerType | string;
  visible?: boolean;
  bgType?: "solid" | "gradient" | "image" | string;
  value?: string;
  effect?: string;
  intensity?: number;
  density?: number;
  color?: string;
  source?: string;
  loop?: boolean;
  speed?: number;
  autoPlay?: boolean;
  src?: string;
  alt?: string;
  content?: string;
  assetType?: "text" | "image" | "tag" | string;
  tag?: string;
  styles?: Record<string, StyleValue>;
  nativeStyles?: Record<string, StyleValue>;
  animation?: BannerAnimation;
  components?: BannerLayer[];
  media?: Record<string, Record<string, StyleValue>>;
};

type DashboardBannerConfig = {
  activeBannerId?: string;
  bannerTools?: {
    mode?: "manual" | "auto" | string;
    autoplay?: boolean;
    intervalMs?: number;
    transition?: "fade" | "slide" | "zoom" | "none" | string;
  };
  banner?: {
    id?: string;
    duration?: number;
    width?: string;
    height?: string;
    designWidth?: number;
    designHeight?: number;
    aspectRatio?: number | string;
    actionUrl?: string;
    background?: BannerBackground;
    styles?: Record<string, StyleValue>;
    nativeStyles?: Record<string, StyleValue>;
    elements?: BannerElement[];
    layers?: BannerLayer[];
  };
  banners?: Array<DashboardBannerConfig["banner"]>;
};

const isSandbox = process.env.NODE_ENV !== "production";
const bannerConfigPath = path.join(process.cwd(), "data", "dashboard-banner.json");
const bannerAssetPath = path.join(process.cwd(), "data", "dashboard-banner-asset.svg");
const bannerDataDir = path.join(process.cwd(), "data");
const DEFAULT_DESIGN_WIDTH = 800;
const DEFAULT_DESIGN_HEIGHT = 220;

const defaultBannerConfig: DashboardBannerConfig = {
  bannerTools: {
    mode: "auto",
    autoplay: true,
    intervalMs: 6000,
    transition: "fade",
  },
  banner: {
    width: "100%",
    height: "220px",
    designWidth: DEFAULT_DESIGN_WIDTH,
    designHeight: DEFAULT_DESIGN_HEIGHT,
    aspectRatio: DEFAULT_DESIGN_WIDTH / DEFAULT_DESIGN_HEIGHT,
    actionUrl: "/dashboard",
    background: {
      type: "color",
      value: "#154562",
    },
    styles: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
      overflow: "hidden",
      borderRadius: "18px",
    },
    nativeStyles: {
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
      borderRadius: 18,
    },
    elements: [],
    layers: [],
  },
};

const resolveOrigin = (req: Request) => {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol =
    typeof forwardedProto === "string"
      ? forwardedProto.split(",")[0].trim()
      : req.protocol;
  return `${protocol}://${req.get("host")}`;
};

const toAssetUrl = (origin: string, input?: string) => {
  const value = String(input || "").trim();
  if (!value) return value;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) return value;
  if (value.startsWith("/")) return `${origin}${value}`;
  return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const parsePositiveNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parsePxValue = (value: unknown) => {
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? value : null;
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized.endsWith("px")) return null;
  const parsed = Number(normalized.replace("px", "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const inferLegacyLayerType = (element: BannerElement): BannerLayerType => {
  const tag = String(element.tag || "").toLowerCase();
  if (tag === "img" || element.src) return "image";
  if (tag === "canvas") return "canvas";
  if (tag === "lottie") return "lottie";
  if (element.content) return element.animation?.name ? "animated" : "text";
  return "background";
};

const mapLegacyElementToLayer = (element: BannerElement, index: number): BannerLayer => {
  const type = inferLegacyLayerType(element);
  return {
    id: element.className || `legacy-${index}`,
    type,
    src: element.src,
    value: element.content,
    content: element.content,
    alt: element.alt,
    tag: element.tag,
    styles: element.styles,
    nativeStyles: element.nativeStyles,
    animation: element.animation,
    components: Array.isArray(element.children)
      ? element.children.map((child, childIndex) => mapLegacyElementToLayer(child, childIndex))
      : [],
  };
};

const absolutizeLayerNode = (layer: BannerLayer, origin: string): BannerLayer => {
  const layerType = String(layer.type || "").toLowerCase();
  const next: BannerLayer = {
    ...layer,
    components: Array.isArray(layer.components)
      ? layer.components.map((child) => absolutizeLayerNode(child, origin))
      : [],
  };

  if (layerType === "image" || layerType === "animated") {
    next.src = toAssetUrl(origin, layer.src);
    if (layer.assetType === "image") {
      next.value = toAssetUrl(origin, layer.value);
    }
  }

  if (layerType === "background" && layer.bgType === "image") {
    next.value = toAssetUrl(origin, layer.value);
  }

  if (layerType === "lottie") {
    next.source = toAssetUrl(origin, layer.source);
  }

  return next;
};

const absolutizeLayers = (layers: BannerLayer[] | undefined, origin: string): BannerLayer[] => {
  const source = Array.isArray(layers) ? layers : [];
  return source.map((layer) => absolutizeLayerNode(layer, origin));
};

const absolutizeNodes = (nodes: BannerElement[] | undefined, origin: string): BannerElement[] => {
  const source = Array.isArray(nodes) ? nodes : [];
  return source.map((node) => ({
    ...node,
    src: toAssetUrl(origin, node?.src),
    children: absolutizeNodes(node?.children, origin),
  }));
};

const normalizeBannerLayers = (banner: DashboardBannerConfig["banner"]): BannerLayer[] => {
  if (Array.isArray(banner?.layers) && banner.layers.length > 0) return banner.layers;
  if (Array.isArray(banner?.elements) && banner.elements.length > 0) {
    return banner.elements.map((element, index) => mapLegacyElementToLayer(element, index));
  }
  return [];
};

const hasRenderableValue = (value: unknown) => String(value || "").trim().length > 0;

const hasRenderableLayer = (layer: BannerLayer): boolean => {
  if (!layer || layer.visible === false) return false;

  const layerType = String(layer.type || "").toLowerCase();
  if (layerType === "image") return hasRenderableValue(layer.src) || hasRenderableValue(layer.value);
  if (layerType === "text" || layerType === "animated") return hasRenderableValue(layer.content) || hasRenderableValue(layer.value);
  if (layerType === "background") return hasRenderableValue(layer.value);
  if (layerType === "lottie") return hasRenderableValue(layer.source);

  const children = Array.isArray(layer.components) ? layer.components : [];
  if (children.some((child) => hasRenderableLayer(child))) return true;

  return ["particles", "canvas"].includes(layerType);
};

const hasRenderableBanner = (banner: DashboardBannerConfig["banner"] | undefined): boolean => {
  if (!banner) return false;

  const layers = normalizeBannerLayers(banner);
  if (layers.some((layer) => hasRenderableLayer(layer))) return true;

  if (Array.isArray(banner.elements) && banner.elements.length > 0) {
    return banner.elements.some((element) =>
      hasRenderableValue(element?.content) || hasRenderableValue(element?.src),
    );
  }

  return hasRenderableValue(banner.background?.image) || hasRenderableValue(banner.background?.value);
};

const buildFallbackBackgroundLayer = (
  banner: DashboardBannerConfig["banner"] | undefined,
  origin: string,
): BannerLayer | null => {
  const background = banner?.background;
  if (!background) return null;

  const type = String((background as any)?.bgType || background.type || "").toLowerCase();
  const imageCandidate = String(background.image || "").trim();
  const valueCandidate = String(background.value || "").trim();
  const isImage = type === "image" || (!!imageCandidate && imageCandidate.includes("/"));
  const isGradient = !isImage && valueCandidate.toLowerCase().includes("gradient(");
  const rawValue = isImage ? (imageCandidate || valueCandidate) : valueCandidate;
  if (!rawValue) return null;

  return {
    id: "auto-background-layer",
    type: "background",
    visible: true,
    bgType: isImage ? "image" : isGradient ? "gradient" : "solid",
    value: isImage ? toAssetUrl(origin, rawValue) : rawValue,
    styles: {
      position: "absolute",
      top: "0px",
      left: "0px",
      width: "100%",
      height: "100%",
      zIndex: 0,
    },
    nativeStyles: {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      zIndex: 0,
    },
  };
};

const normalizeConfig = (raw: unknown): DashboardBannerConfig => {
  if (!raw || typeof raw !== "object") return defaultBannerConfig;

  const source = raw as DashboardBannerConfig;
  const sourceAny = source as any;
  const bannerTools = {
    mode: sourceAny?.bannerTools?.mode === "manual" ? "manual" : "auto",
    autoplay: sourceAny?.bannerTools?.autoplay == null ? true : Boolean(sourceAny?.bannerTools?.autoplay),
    intervalMs: Math.max(1000, Math.round(Number(sourceAny?.bannerTools?.intervalMs) || 6000)),
    transition: (["fade", "slide", "zoom", "none"].includes(String(sourceAny?.bannerTools?.transition || ""))
      ? String(sourceAny?.bannerTools?.transition)
      : "fade") as "fade" | "slide" | "zoom" | "none",
  };
  const activeBannerId = typeof sourceAny?.activeBannerId === "string" && sourceAny.activeBannerId.trim().length > 0
    ? sourceAny.activeBannerId.trim()
    : undefined;
  const banners: Array<NonNullable<DashboardBannerConfig["banner"]>> = [];

  const unwrapBannerItem = (input: any) => {
    if (!input || typeof input !== "object") return input;
    if (input.banner && typeof input.banner === "object") {
      return {
        ...input.banner,
        id: input.banner.id ?? input.id,
      };
    }
    return input;
  };

  const processBanner = (b: any) => {
    const sourceBanner = unwrapBannerItem(b);
    if (!sourceBanner || typeof sourceBanner !== "object") return null;
    const elements = Array.isArray(sourceBanner.elements) ? sourceBanner.elements : [];
    const designWidth =
      parsePositiveNumber(sourceBanner.designWidth)
      ?? parsePxValue(sourceBanner.width)
      ?? DEFAULT_DESIGN_WIDTH;
    const ratioCandidate = parsePositiveNumber(sourceBanner.aspectRatio);
    const designHeight =
      parsePositiveNumber(sourceBanner.designHeight)
      ?? parsePxValue(sourceBanner.height)
      ?? (ratioCandidate ? designWidth / ratioCandidate : DEFAULT_DESIGN_HEIGHT);
    const aspectRatio = ratioCandidate ?? (designWidth / designHeight);

    return {
      ...defaultBannerConfig.banner,
      ...sourceBanner,
      designWidth,
      designHeight,
      aspectRatio,
      height: sourceBanner.height ?? `${designHeight}px`,
      background: {
        ...(defaultBannerConfig.banner?.background ?? {}),
        ...(sourceBanner.background ?? {}),
      },
      styles: {
        ...(defaultBannerConfig.banner?.styles ?? {}),
        ...(sourceBanner.styles ?? {}),
      },
      nativeStyles: {
        ...(defaultBannerConfig.banner?.nativeStyles ?? {}),
        ...(sourceBanner.nativeStyles ?? {}),
      },
      elements,
      layers: normalizeBannerLayers({
        ...sourceBanner,
        elements,
      }),
    };
  };

  if (Array.isArray(source.banners)) {
    source.banners.forEach((b) => {
      const normalized = processBanner(b);
      if (normalized) banners.push(normalized);
    });
  }

  if (source.banner && typeof source.banner === "object") {
    const normalized = processBanner(source.banner);
    if (normalized) {
      // Evitar duplicados si ya estaba en el array de banners
      if (!banners.some((b) => b.id === normalized.id)) {
        banners.push(normalized);
      }
    }
  }

  if (banners.length === 0) {
    return defaultBannerConfig;
  }

  return {
    banner: banners[0],
    banners,
    bannerTools,
    activeBannerId,
  };
};

const readBannerConfig = (): { data: DashboardBannerConfig; lastUpdated: number | null; exists: boolean } => {
  if (!fs.existsSync(bannerConfigPath)) {
    return { data: defaultBannerConfig, lastUpdated: null, exists: false };
  }

  try {
    const stats = fs.statSync(bannerConfigPath);
    const raw = fs.readFileSync(bannerConfigPath, "utf-8");
    const parsed = JSON.parse(raw);
    return { data: normalizeConfig(parsed), lastUpdated: stats.mtimeMs, exists: true };
  } catch {
    return { data: defaultBannerConfig, lastUpdated: null, exists: false };
  }
};

export class BannerController {
  static async obtenerBannerMeta(_req: Request, res: Response) {
    const { data, lastUpdated, exists } = readBannerConfig();
    const banner = data.banner ?? defaultBannerConfig.banner;
    const hasBanner = exists && hasRenderableBanner(banner);
    const version = hasBanner && typeof lastUpdated === "number" ? String(Math.round(lastUpdated)) : null;

    return res.status(200).json({
      success: true,
      data: {
        hasBanner,
        version,
        lastUpdated,
      },
    });
  }

  static async obtenerBanner(req: Request, res: Response) {
    try {
      const origin = resolveOrigin(req);
      const { data, lastUpdated } = readBannerConfig();

      const bannersSource = Array.isArray(data.banners) ? data.banners : data.banner ? [data.banner] : [];
      const banners = bannersSource.map((b) => {
        const normalizedStack = normalizeBannerLayers(b);
        const stack = absolutizeLayers(normalizedStack, origin);
        const fallback = stack.length === 0 ? buildFallbackBackgroundLayer(b, origin) : null;
        const resolvedStack = fallback ? [fallback] : stack;

        return {
          ...b,
          background: {
            ...(b?.background ?? {}),
            image: toAssetUrl(origin, b?.background?.image),
            value:
              b?.background?.type === "image" || (b?.background as any)?.bgType === "image"
                ? toAssetUrl(origin, b?.background?.value)
                : b?.background?.value,
          },
          elements: absolutizeNodes(b?.elements, origin),
          layers: resolvedStack,
        };
      });

      const responsePayload: DashboardBannerConfig = {
        banner: banners[0],
        banners,
        bannerTools: (data as any).bannerTools,
        activeBannerId: (data as any).activeBannerId,
      };

      return res.status(200).json({
        success: true,
        data: responsePayload,
        lastUpdated,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: "Error interno al cargar configuracion del banner",
        details: isSandbox ? error : undefined,
      });
    }
  }

  static async obtenerBannerAsset(_req: Request, res: Response) {
    if (!fs.existsSync(bannerAssetPath)) {
      return res.status(404).send("Asset no encontrado");
    }

    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.status(200).sendFile(bannerAssetPath);
  }

  static async obtenerBannerAssetByName(req: Request, res: Response) {
    const rawAssetName = String(req.params.assetName || "").trim();
    const assetName = path.basename(rawAssetName);
    const isValidName = /^[a-zA-Z0-9._-]+\.(svg|png|jpe?g|webp|gif|avif)$/i.test(assetName);

    if (!isValidName || assetName !== rawAssetName) {
      return res.status(400).json({
        success: false,
        error: "Nombre de asset invalido",
      });
    }

    const filePath = path.join(bannerDataDir, assetName);
    if (!filePath.startsWith(bannerDataDir)) {
      return res.status(400).json({
        success: false,
        error: "Ruta de asset invalida",
      });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "Asset no encontrado",
      });
    }

    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.status(200).sendFile(filePath);
  }
}
