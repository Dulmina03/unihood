import { proxyBoardingUnits } from '../../../../../lib/boardings/units';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return proxyBoardingUnits(request,(await params).id);}
