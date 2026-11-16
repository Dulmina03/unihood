import { proxyPoiDetail } from '../../../../lib/places/detail';
export async function GET(request: Request, {params}: {params: Promise<{id: string}>}) {return proxyPoiDetail((await params).id, request);}
