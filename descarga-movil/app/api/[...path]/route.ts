import { handleApi } from "../../../lib/api";
import { canonicalRequest, getEnvironment } from "../../../lib/environment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const handler = (request: Request) => handleApi(canonicalRequest(request), getEnvironment());
export { handler as GET, handler as HEAD, handler as POST, handler as PUT, handler as DELETE };
