import { PublicPoiProposal } from '../../../components/contribute/public-poi-proposal';
import { duplicateEndpoint } from '../../../lib/places/duplicate-endpoint';
import { mapProvider } from '../../../lib/maps/provider';
export const dynamic='force-dynamic';
export const metadata={title:'Add a public place | UniHood',robots:{index:false,follow:false}};
export default function PublicPlacePage(){return <PublicPoiProposal endpoint={duplicateEndpoint(process.env)} provider={mapProvider(process.env)}/>;}
