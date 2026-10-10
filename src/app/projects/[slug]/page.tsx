import { metadataFor, pageFor, staticParamsFor } from '@/lib/entity-route';

export const dynamicParams = false;
export const generateStaticParams = staticParamsFor('Projects');
export const generateMetadata = metadataFor('Projects');
export default pageFor('Projects');
