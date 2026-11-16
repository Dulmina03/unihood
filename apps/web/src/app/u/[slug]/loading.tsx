import { SiteHeader, Skeleton } from '@unihood/ui';
export default function LoadingUniversity() {return <><SiteHeader items={[{label: 'Choose a university', href: '/#campus-start'}]} /><main className="landing-state"><h1>Opening your university</h1><Skeleton label="Loading university information" /></main></>;}
