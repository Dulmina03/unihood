import { DuplicateReview } from '../../../components/places/duplicate-review';
import { duplicateEndpoint } from '../../../lib/places/duplicate-endpoint';
export const dynamic='force-dynamic';
export const metadata={title:'Review possible public place matches | UniHood',robots:{index:false,follow:false}};
export default function DuplicatePage(){return <DuplicateReview endpoint={duplicateEndpoint(process.env)} />;}
