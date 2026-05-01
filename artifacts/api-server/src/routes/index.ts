import { Router, type IRouter } from "express";
import healthRouter from "./health";
import minerRouter from "./miner";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/miner", minerRouter);
router.use("/ai", aiRouter);

export default router;
