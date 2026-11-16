import { proxyUniversity } from '../../../lib/universities/proxy';
export async function GET(request: Request) {return proxyUniversity('universities', request);}
