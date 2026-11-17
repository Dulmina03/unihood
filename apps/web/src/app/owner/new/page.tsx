import { OwnerWizard } from '../../../components/owner/owner-wizard';
import { ownerDraftEndpoint } from '../../../lib/owner/draft';
export const dynamic='force-dynamic';
export const metadata={title:'Owner listing draft | UniHood',robots:{index:false,follow:false}};
export default function OwnerWizardPage(){return <OwnerWizard endpoint={ownerDraftEndpoint(process.env)}/>;}
