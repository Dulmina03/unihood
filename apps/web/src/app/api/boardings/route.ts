import { proxyBoardings } from '../../../lib/boardings/api';
export const GET=(request:Request)=>proxyBoardings(request);
