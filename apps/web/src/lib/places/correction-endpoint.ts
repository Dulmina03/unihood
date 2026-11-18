import {recommendationEndpoint} from '../boardings/recommendation-endpoint';
export function contributionEndpoint(env:Readonly<Record<string,string|undefined>>):string|null{
 const endpoint=recommendationEndpoint(env);return endpoint?endpoint.replace(/\/boarding$/,''):null;
}
