import { proxyPlaces } from '../../../lib/places/api';
export async function GET(request:Request){return proxyPlaces('places',request);}
