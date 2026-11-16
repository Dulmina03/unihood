import { proxyUniversity } from '../../../../../lib/universities/proxy';
export async function GET(request: Request, {params}: {params: Promise<{id: string}>}) {return proxyUniversity('entrances', request, (await params).id);}
