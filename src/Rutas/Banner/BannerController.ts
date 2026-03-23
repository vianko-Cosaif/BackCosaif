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
  availableBanners?: Array<{
    id?: string;
    name?: string;
    order?: number;
  }>;
  bannerItems?: Array<{
    id?: string;
    name?: string;
    order?: number;
    banner?: NonNullable<DashboardBannerConfig["banner"]>;
  }>;
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

const BANNER_ASSET_PATH_REGEX = /\/(?:dashboard\/)?banner\/assets\//i;
const LOCAL_BANNER_ASSET_NAME_REGEX = /^[a-zA-Z0-9._-]+\.(svg|png|jpe?g|webp|gif|avif)$/i;

const appendVersionParam = (url: string, versionToken?: string | null) => {
  if (!versionToken) return url;
  const value = String(url || "").trim();
  if (!value || value.startsWith("data:")) return value;

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      const parsed = new URL(value);
      if (!BANNER_ASSET_PATH_REGEX.test(parsed.pathname)) return value;
      parsed.searchParams.set("v", versionToken);
      return parsed.toString();
    } catch {
      return value;
    }
  }

  if (!BANNER_ASSET_PATH_REGEX.test(value)) return value;
  const [withoutHash, hash = ""] = value.split("#", 2);
  const [pathname, search = ""] = withoutHash.split("?", 2);
  const params = new URLSearchParams(search);
  params.set("v", versionToken);
  return `${pathname}?${params.toString()}${hash ? `#${hash}` : ""}`;
};

const toAssetUrl = (origin: string, input?: string, versionToken?: string | null) => {
  const value = String(input || "").trim();
  if (!value) return value;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) {
    return appendVersionParam(value, versionToken);
  }
  if (value.startsWith("/")) return appendVersionParam(`${origin}${value}`, versionToken);
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

const absolutizeLayerNode = (
  layer: BannerLayer,
  origin: string,
  versionToken?: string | null,
): BannerLayer => {
  const layerType = String(layer.type || "").toLowerCase();
  const next: BannerLayer = {
    ...layer,
    components: Array.isArray(layer.components)
      ? layer.components.map((child) => absolutizeLayerNode(child, origin, versionToken))
      : [],
  };

  if (layerType === "image" || layerType === "animated") {
    next.src = toAssetUrl(origin, layer.src, versionToken);
    if (layer.assetType === "image") {
      next.value = toAssetUrl(origin, layer.value, versionToken);
    }
  }

  if (layerType === "background" && layer.bgType === "image") {
    next.value = toAssetUrl(origin, layer.value, versionToken);
  }

  if (layerType === "lottie") {
    next.source = toAssetUrl(origin, layer.source, versionToken);
  }

  return next;
};

const absolutizeLayers = (
  layers: BannerLayer[] | undefined,
  origin: string,
  versionToken?: string | null,
): BannerLayer[] => {
  const source = Array.isArray(layers) ? layers : [];
  return source.map((layer) => absolutizeLayerNode(layer, origin, versionToken));
};

const absolutizeNodes = (
  nodes: BannerElement[] | undefined,
  origin: string,
  versionToken?: string | null,
): BannerElement[] => {
  const source = Array.isArray(nodes) ? nodes : [];
  return source.map((node) => ({
    ...node,
    src: toAssetUrl(origin, node?.src, versionToken),
    children: absolutizeNodes(node?.children, origin, versionToken),
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
  versionToken?: string | null,
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
    value: isImage ? toAssetUrl(origin, rawValue, versionToken) : rawValue,
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

const parseOrder = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed);
};

const normalizeBannerId = (value: unknown) => String(value || "").trim();

const normalizeBannerName = (value: unknown, fallbackIndex: number) => {
  const raw = String(value || "").trim();
  return raw || `Banner ${fallbackIndex + 1}`;
};

const buildOrderMap = (source: any) => {
  const orderMap = new Map<string, number>();
  const setFrom = (candidate: any, fallbackIndex: number) => {
    if (!candidate || typeof candidate !== "object") return;
    const id = normalizeBannerId(candidate.id ?? candidate?.banner?.id);
    if (!id || orderMap.has(id)) return;
    orderMap.set(id, parseOrder(candidate.order, fallbackIndex));
  };

  if (Array.isArray(source?.bannerItems)) {
    source.bannerItems.forEach((item: any, index: number) => setFrom(item, index));
  }
  if (Array.isArray(source?.availableBanners)) {
    source.availableBanners.forEach((item: any, index: number) => setFrom(item, index));
  }
  if (Array.isArray(source?.banners)) {
    source.banners.forEach((item: any, index: number) => setFrom(item, index));
  }

  return orderMap;
};

const dedupeAndSortBanners = (
  banners: Array<NonNullable<DashboardBannerConfig["banner"]>>,
  orderMap: Map<string, number>,
) => {
  const deduped: Array<NonNullable<DashboardBannerConfig["banner"]>> = [];
  const seenIds = new Set<string>();
  banners.forEach((banner) => {
    const id = normalizeBannerId((banner as any)?.id);
    if (id) {
      if (seenIds.has(id)) return;
      seenIds.add(id);
    }
    deduped.push(banner);
  });

  const ranked = deduped.map((banner, index) => {
    const id = normalizeBannerId((banner as any)?.id);
    const rank = id && orderMap.has(id) ? orderMap.get(id)! : Number.MAX_SAFE_INTEGER;
    return { banner, index, rank };
  });

  ranked.sort((a, b) => (a.rank === b.rank ? a.index - b.index : a.rank - b.rank));
  return ranked.map((item) => item.banner);
};

const normalizeConfig = (raw: unknown): DashboardBannerConfig => {
  if (!raw || typeof raw !== "object") return defaultBannerConfig;

  const source = raw as DashboardBannerConfig;
  const sourceAny = source as any;
  const orderMap = buildOrderMap(sourceAny);
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

  const orderedBanners = dedupeAndSortBanners(banners, orderMap);
  const selectedBanner = (() => {
    if (!orderedBanners.length) return undefined;
    const targetId = normalizeBannerId(activeBannerId);
    if (targetId) {
      const match = orderedBanners.find((banner) => normalizeBannerId((banner as any)?.id) === targetId);
      if (match) return match;
    }
    return orderedBanners[0];
  })();
  const selectedActiveBannerId = normalizeBannerId((selectedBanner as any)?.id)
    || normalizeBannerId((orderedBanners[0] as any)?.id)
    || undefined;

  const bannerItems = orderedBanners.map((banner, index) => {
    const id = normalizeBannerId((banner as any)?.id) || `banner-${index + 1}`;
    return {
      id,
      name: normalizeBannerName((banner as any)?.name, index),
      order: orderMap.has(id) ? orderMap.get(id)! : index,
      banner,
    };
  });
  bannerItems.sort((a, b) => (a.order === b.order ? 0 : a.order - b.order));
  const availableBanners = bannerItems.map(({ id, name, order }) => ({ id, name, order }));

  return {
    banner: selectedBanner ?? orderedBanners[0],
    banners: bannerItems.map((item) => item.banner),
    bannerTools,
    activeBannerId: selectedActiveBannerId,
    availableBanners,
    bannerItems,
  };
};

const ROLE_ALIASES: Record<string, string> = {
  ADMIN: "ADMIN",
  ADMINISTRADOR: "ADMIN",
  GERENTE: "GERENTE",
  GERENCIA: "GERENTE",
  SUPERVISOR: "SUPERVISOR",
  EMPLEADO: "EMPLEADO",
  RH: "RH",
  COORDINADOR: "COORDINADOR",
  CLIENTE: "CLIENTE",
};

const normalizeUserType = (value: unknown): string | null => {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, "_");
  return ROLE_ALIASES[compact] || compact;
};

const extractRoleList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeUserType(item))
      .filter((item): item is string => Boolean(item));
  }

  if (typeof value === "string") {
    return value
      .split(/[,;|]/)
      .map((item) => normalizeUserType(item))
      .filter((item): item is string => Boolean(item));
  }

  return [];
};

const resolveBannerRoles = (banner: NonNullable<DashboardBannerConfig["banner"]>): string[] => {
  const source = banner as any;
  const candidates = [
    source.visibleFor,
    source.roles,
    source.userTypes,
    source.targetRoles,
    source.audience?.roles,
    source.meta?.visibleFor,
    source.meta?.roles,
    source.permissions?.roles,
    source.access?.roles,
  ];

  const merged = candidates.flatMap((candidate) => extractRoleList(candidate));
  return [...new Set(merged)];
};

const canBannerBeViewedByUserType = (
  banner: NonNullable<DashboardBannerConfig["banner"]>,
  userType: string | null,
): boolean => {
  if (!userType) return true;
  const allowedRoles = resolveBannerRoles(banner);
  if (allowedRoles.length === 0) return true;
  return allowedRoles.includes(userType);
};

const firstHeaderValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const resolveRequestedUserType = (req: Request): string | null => {
  const queryUserType = Array.isArray(req.query.userType) ? req.query.userType[0] : req.query.userType;
  const queryRole = Array.isArray(req.query.role) ? req.query.role[0] : req.query.role;
  const headerUserType = firstHeaderValue(req.headers["x-user-type"] as string | string[] | undefined);
  return normalizeUserType(queryUserType ?? queryRole ?? headerUserType);
};

const selectBannersForUserType = (
  data: DashboardBannerConfig,
  userType: string | null,
): Array<NonNullable<DashboardBannerConfig["banner"]>> => {
  const sourceBanners = Array.isArray(data.banners) && data.banners.length > 0
    ? data.banners
    : (data.banner ? [data.banner] : []);
  return sourceBanners.filter((banner): banner is NonNullable<DashboardBannerConfig["banner"]> => {
    if (!banner) return false;
    return canBannerBeViewedByUserType(banner, userType);
  });
};

const pickActiveBanner = (
  banners: Array<NonNullable<DashboardBannerConfig["banner"]>>,
  activeBannerId?: string,
) => {
  if (banners.length === 0) return undefined;
  if (activeBannerId) {
    const match = banners.find((banner) => String((banner as any)?.id || "") === activeBannerId);
    if (match) return match;
  }
  return banners[0];
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

const extractAssetName = (value: unknown): string | null => {
  const raw = String(value || "").trim();
  if (!raw || raw.startsWith("data:")) return null;

  const getBasename = (input: string) => {
    const withoutHash = input.split("#", 1)[0];
    const withoutQuery = withoutHash.split("?", 1)[0];
    return path.basename(withoutQuery);
  };

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    try {
      const parsed = new URL(raw);
      if (!BANNER_ASSET_PATH_REGEX.test(parsed.pathname)) return null;
      const name = path.basename(parsed.pathname);
      return LOCAL_BANNER_ASSET_NAME_REGEX.test(name) ? name : null;
    } catch {
      return null;
    }
  }

  const candidate = getBasename(raw.startsWith("/") ? raw : `/${raw}`);
  if (!LOCAL_BANNER_ASSET_NAME_REGEX.test(candidate)) return null;
  return candidate;
};

const collectLayerAssets = (layer: BannerLayer | undefined, target: Set<string>) => {
  if (!layer) return;
  const layerType = String(layer.type || "").toLowerCase();
  if (layerType === "image" || layerType === "animated") {
    const srcName = extractAssetName(layer.src);
    if (srcName) target.add(srcName);
    if (layer.assetType === "image") {
      const valueName = extractAssetName(layer.value);
      if (valueName) target.add(valueName);
    }
  }
  if (layerType === "background" && layer.bgType === "image") {
    const bgName = extractAssetName(layer.value);
    if (bgName) target.add(bgName);
  }
  if (layerType === "lottie") {
    const sourceName = extractAssetName(layer.source);
    if (sourceName) target.add(sourceName);
  }
  if (Array.isArray(layer.components)) {
    layer.components.forEach((child) => collectLayerAssets(child, target));
  }
};

const collectElementAssets = (element: BannerElement | undefined, target: Set<string>) => {
  if (!element) return;
  const srcName = extractAssetName(element.src);
  if (srcName) target.add(srcName);
  if (Array.isArray(element.children)) {
    element.children.forEach((child) => collectElementAssets(child, target));
  }
};

const collectBannerAssetNames = (banner: NonNullable<DashboardBannerConfig["banner"]>) => {
  const names = new Set<string>();
  const bg = banner.background;
  const bgType = String((bg as any)?.bgType || bg?.type || "").toLowerCase();
  if (bgType === "image") {
    const imageName = extractAssetName(bg?.image);
    const valueName = extractAssetName(bg?.value);
    if (imageName) names.add(imageName);
    if (valueName) names.add(valueName);
  }

  normalizeBannerLayers(banner).forEach((layer) => collectLayerAssets(layer, names));
  (Array.isArray(banner.elements) ? banner.elements : []).forEach((element) =>
    collectElementAssets(element, names),
  );
  return names;
};

const resolveBannerVersionToken = (
  data: DashboardBannerConfig,
  userType: string | null,
  configMtimeMs: number | null,
): string | null => {
  const visibleBanners = selectBannersForUserType(data, userType);
  if (visibleBanners.length === 0) return null;

  let maxMtime = typeof configMtimeMs === "number" ? configMtimeMs : 0;
  const seen = new Set<string>();
  visibleBanners.forEach((banner) => {
    collectBannerAssetNames(banner).forEach((assetName) => seen.add(assetName));
  });

  seen.forEach((assetName) => {
    const filePath = path.join(bannerDataDir, assetName);
    if (!filePath.startsWith(bannerDataDir)) return;
    if (!fs.existsSync(filePath)) return;
    try {
      const stat = fs.statSync(filePath);
      if (Number.isFinite(stat.mtimeMs)) {
        maxMtime = Math.max(maxMtime, stat.mtimeMs);
      }
    } catch {
      // ignore stat errors for individual files
    }
  });

  return maxMtime > 0 ? String(Math.round(maxMtime)) : null;
};

export class BannerController {
  static async obtenerBannerMeta(req: Request, res: Response) {
    const { data, lastUpdated, exists } = readBannerConfig();
    const userType = resolveRequestedUserType(req);
    const visibleBanners = selectBannersForUserType(data, userType);
    const banner = pickActiveBanner(visibleBanners, data.activeBannerId);
    const hasBanner = exists && hasRenderableBanner(banner);
    const version = hasBanner ? resolveBannerVersionToken(data, userType, lastUpdated) : null;

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
      const userType = resolveRequestedUserType(req);
      const version = resolveBannerVersionToken(data, userType, lastUpdated);

      const bannersSource = selectBannersForUserType(data, userType);
      const banners = bannersSource.map((b) => {
        const normalizedStack = normalizeBannerLayers(b);
        const stack = absolutizeLayers(normalizedStack, origin, version);
        const fallback = stack.length === 0 ? buildFallbackBackgroundLayer(b, origin, version) : null;
        const resolvedStack = fallback ? [fallback] : stack;

        return {
          ...b,
          background: {
            ...(b?.background ?? {}),
            image: toAssetUrl(origin, b?.background?.image, version),
            value:
              b?.background?.type === "image" || (b?.background as any)?.bgType === "image"
                ? toAssetUrl(origin, b?.background?.value, version)
                : b?.background?.value,
          },
          elements: absolutizeNodes(b?.elements, origin, version),
          layers: resolvedStack,
        };
      });

      const sourceOrderMap = new Map<string, number>();
      const sourceNameMap = new Map<string, string>();
      (data.bannerItems || []).forEach((item, index) => {
        const id = normalizeBannerId(item?.id ?? item?.banner?.id);
        if (!id) return;
        if (!sourceOrderMap.has(id)) sourceOrderMap.set(id, parseOrder(item?.order, index));
        if (!sourceNameMap.has(id)) {
          sourceNameMap.set(id, normalizeBannerName(item?.name ?? (item?.banner as any)?.name, index));
        }
      });
      (data.availableBanners || []).forEach((item, index) => {
        const id = normalizeBannerId(item?.id);
        if (!id) return;
        if (!sourceOrderMap.has(id)) sourceOrderMap.set(id, parseOrder(item?.order, index));
        if (!sourceNameMap.has(id)) {
          sourceNameMap.set(id, normalizeBannerName(item?.name, index));
        }
      });

      const bannerItems = banners.map((banner, index) => {
        const id = normalizeBannerId((banner as any)?.id) || `banner-${index + 1}`;
        return {
          id,
          name: sourceNameMap.get(id) || normalizeBannerName((banner as any)?.name, index),
          order: sourceOrderMap.has(id) ? sourceOrderMap.get(id)! : index,
          banner,
        };
      });
      bannerItems.sort((a, b) => (a.order === b.order ? 0 : a.order - b.order));
      const orderedBanners = bannerItems.map((item) => item.banner);
      const availableBanners = bannerItems.map(({ id, name, order }) => ({ id, name, order }));
      const activeBanner = pickActiveBanner(orderedBanners, data.activeBannerId);

      const responsePayload: DashboardBannerConfig = {
        banner: activeBanner,
        banners: orderedBanners,
        bannerTools: (data as any).bannerTools,
        activeBannerId: normalizeBannerId((activeBanner as any)?.id) || normalizeBannerId((orderedBanners[0] as any)?.id),
        availableBanners,
        bannerItems,
      };

      return res.status(200).json({
        success: true,
        data: responsePayload,
        version,
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
