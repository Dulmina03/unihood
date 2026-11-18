import {ContributionHistory} from '../../components/contribute/contribution-history';
import {contributionEndpoint} from '../../lib/places/correction-endpoint';
export const dynamic='force-dynamic';
export const metadata={title:'Your contribution history | UniHood',robots:{index:false,follow:false}};
export default function Page(){return <ContributionHistory endpoint={contributionEndpoint(process.env)}/>;}
