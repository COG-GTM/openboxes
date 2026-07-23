import React, { useEffect, useState } from 'react';

import PropTypes from 'prop-types';

import mobileApi from 'api/services/MobileApi';
import MobileLayout from 'components/mobile/MobileLayout';
import ReportPagination from 'components/reporting/ReportPagination';
import { MOBILE_URL } from 'consts/applicationUrls';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';

const PAGE_SIZE = 10;

const HandlingIcons = ({ icons }) => (
  <>
    {(icons ?? []).map((icon) => (
      <i
        key={icon.icon}
        className={`fa ${icon.icon} mr-1`}
        style={{ color: icon.color || 'inherit' }}
        title={icon.label}
      />
    ))}
  </>
);

HandlingIcons.propTypes = {
  icons: PropTypes.arrayOf(PropTypes.shape({
    icon: PropTypes.string,
    color: PropTypes.string,
    label: PropTypes.string,
  })),
};

HandlingIcons.defaultProps = {
  icons: [],
};

const MobileProductList = () => {
  useTranslation('mobile', 'default');

  const translate = useTranslate();
  const [productSummaries, setProductSummaries] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const response = await mobileApi.getProductSummaries({
        params: { max: PAGE_SIZE, offset: page * PAGE_SIZE },
      });
      setProductSummaries(response?.data?.data ?? []);
      setTotalCount(response?.data?.totalCount ?? 0);
    };
    fetchData();
  }, [page]);

  return (
    <MobileLayout title={translate('react.mobile.products.label', 'Products')}>
      <div className="row g-0" data-testid="mobile-product-list">
        <table className="table table-borderless">
          <tbody>
            {productSummaries.map(({ product, quantityOnHand }) => (
              <tr className="border-bottom" key={product.id}>
                <td className="col-2">
                  <picture>
                    <a href={MOBILE_URL.productDetails(product.id)} className="text-decoration-none">
                      <img
                        src={product.thumbnailId
                          ? MOBILE_URL.productImage(product.thumbnailId)
                          : MOBILE_URL.defaultProductImage()}
                        alt={product.name}
                        className="img-fluid"
                      />
                    </a>
                  </picture>
                </td>
                <td className="col-8">
                  <a href={MOBILE_URL.productDetails(product.id)} className="text-decoration-none text-reset">
                    <h5>{`${product.productCode} ${product.name}`}</h5>
                  </a>
                  <HandlingIcons icons={product.handlingIcons} />
                  {product.description && (
                    <div className="d-flex align-items-center justify-content-between mt-1">
                      {product.description}
                    </div>
                  )}
                </td>
                <td>
                  <a href={MOBILE_URL.productDetails(product.id)} className="text-decoration-none text-reset">
                    {Math.round(quantityOnHand ?? 0).toLocaleString()}
                    {' '}
                    <small>{product.unitOfMeasure || 'EA'}</small>
                  </a>
                </td>
                <td>
                  <a href={MOBILE_URL.productDetails(product.id)} className="btn btn-link">
                    <i className="fa fa-chevron-right" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <ReportPagination
          page={page}
          pageSize={PAGE_SIZE}
          total={totalCount}
          onPageChange={setPage}
        />
      </div>
    </MobileLayout>
  );
};

export default MobileProductList;
