import { metadataFor, pageFor, staticParamsFor } from '@/lib/entity-route';

export const dynamicParams = false;
export const generateStaticParams = staticParamsFor('People');
export const generateMetadata = metadataFor('People');
export default pageFor('People');
