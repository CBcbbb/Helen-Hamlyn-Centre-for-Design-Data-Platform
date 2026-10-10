import { metadataFor, pageFor, staticParamsFor } from '@/lib/entity-route';

export const dynamicParams = false;
export const generateStaticParams = staticParamsFor('Partners');
export const generateMetadata = metadataFor('Partners');
export default pageFor('Partners');
