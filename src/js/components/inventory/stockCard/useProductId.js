import { useParams } from 'react-router-dom';

import useQueryParams from 'hooks/useQueryParams';

// Legacy links address stock card screens either by path (/showStockCard/:id)
// or by query string (?product.id=...), so support both
const useProductId = () => {
  const { id } = useParams();
  const queryParams = useQueryParams();
  return id || queryParams?.['product.id'];
};

export default useProductId;
