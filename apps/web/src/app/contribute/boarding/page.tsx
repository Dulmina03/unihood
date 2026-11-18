import { BoardingRecommendation } from '../../../components/contribute/boarding-recommendation';
import { recommendationEndpoint } from '../../../lib/boardings/recommendation-endpoint';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Recommend a boarding | UniHood', robots: { index: false, follow: false } };
export default function Page() { return <BoardingRecommendation endpoint={recommendationEndpoint(process.env)} />; }
