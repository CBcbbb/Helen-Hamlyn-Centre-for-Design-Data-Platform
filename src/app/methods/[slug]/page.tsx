import { metadataFor, pageFor, staticParamsFor } from '@/lib/entity-route';

export const dynamicParams = false;
export const generateStaticParams = staticParamsFor('Methods');
export const generateMetadata = metadataFor('Methods');
export default pageFor('Methods');
