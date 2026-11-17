import { proxyBoardings } from '../../../../lib/boardings/api';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return proxyBoardings(request,(await params).id);}
