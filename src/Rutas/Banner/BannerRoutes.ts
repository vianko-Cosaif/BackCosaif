import { Router } from "express";
import { BannerController } from "./BannerController";

const router = Router();

router.get("/meta", BannerController.obtenerBannerMeta);
router.get("/", BannerController.obtenerBanner);
router.get("/assets/banner-asset.svg", BannerController.obtenerBannerAsset);
router.get("/assets/:assetName", BannerController.obtenerBannerAssetByName);

export default router;
