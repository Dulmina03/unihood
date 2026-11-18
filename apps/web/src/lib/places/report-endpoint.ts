import {recommendationEndpoint} from '../boardings/recommendation-endpoint';
export function reportEndpoint(env:Readonly<Record<string,string|undefined>>):string|null{
 const endpoint=recommendationEndpoint(env);return endpoint?endpoint.replace(/\/contributions\/boarding$/,'/reports'):null;
}
