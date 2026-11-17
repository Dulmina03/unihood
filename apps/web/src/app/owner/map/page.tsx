import { OwnerMapSettings } from '../../../components/owner/map-settings';
import { ownerDraftEndpoint } from '../../../lib/owner/draft';
export const dynamic='force-dynamic';
export const metadata={title:'Synthetic map visibility | UniHood',robots:{index:false,follow:false}};
export default function Page(){return <OwnerMapSettings endpoint={ownerDraftEndpoint(process.env)?.replace(/draft-check$/,'map-settings')??null}/>;}
