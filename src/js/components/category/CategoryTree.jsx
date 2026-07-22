import React, {
  useCallback, useEffect, useMemo, useState,
} from 'react';

import _ from 'lodash';
import { RiDragMove2Line, RiPencilLine } from 'react-icons/ri';
import { Link, useHistory } from 'react-router-dom';
import Alert from 'react-s-alert';

import categoryApi from 'api/services/CategoryApi';
import Button from 'components/form-elements/Button';
import { CATEGORY_URL } from 'consts/applicationUrls';
import RoleType from 'consts/roleType';
import useQueryParams from 'hooks/useQueryParams';
import useSpinner from 'hooks/useSpinner';
import useTranslate from 'hooks/useTranslate';
import useTranslation from 'hooks/useTranslation';
import useUserHasPermissions from 'hooks/useUserHasPermissions';
import Translate from 'utils/Translate';
import PageWrapper from 'wrappers/PageWrapper';

import './styles.scss';

const sortCategories = (categories) =>
  _.sortBy(categories ?? [], ['sortOrder', (category) => category.name?.toLowerCase()]);

const CategoryTree = () => {
  useTranslation('category', 'default');
  const history = useHistory();
  const queryParams = useQueryParams();
  const spinner = useSpinner();
  const translate = useTranslate();
  const isAdmin = useUserHasPermissions({ minRequiredRole: RoleType.ROLE_ADMIN });
  const isSuperuser = useUserHasPermissions({ minRequiredRole: RoleType.ROLE_SUPERUSER });

  const [rootCategories, setRootCategories] = useState([]);
  const [assigningParentToProductEnabled, setAssigningParentToProductEnabled] = useState(false);
  const [draggedCategoryId, setDraggedCategoryId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);

  const fetchTree = useCallback(async () => {
    spinner.show();
    try {
      const { data } = await categoryApi.getCategoryTree();
      setRootCategories(data?.data ?? []);
      setAssigningParentToProductEnabled(!!data?.assigningParentToProductEnabled);
    } catch (error) {
      Alert.error(error.response?.data?.errorMessage ?? 'Unable to load categories');
    } finally {
      spinner.hide();
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  const selectedCategory = useMemo(() => {
    if (queryParams?.id) {
      // Like the legacy tree (Category.get(params.id)), ?id may point at any
      // category in the hierarchy, not just a root.
      const findCategory = (categories) => {
        for (let i = 0; i < (categories?.length ?? 0); i += 1) {
          if (categories[i].id === queryParams.id) {
            return categories[i];
          }
          const found = findCategory(categories[i].categories);
          if (found) {
            return found;
          }
        }
        return undefined;
      };
      const found = findCategory(rootCategories);
      if (found) {
        return found;
      }
    }
    return rootCategories.find((category) => category.isRoot) ?? rootCategories[0];
  }, [rootCategories, queryParams?.id]);

  const isDescendantOf = (ancestorId, categories) => {
    for (let i = 0; i < (categories?.length ?? 0); i += 1) {
      if (categories[i].id === ancestorId) {
        return categories[i];
      }
      const found = isDescendantOf(ancestorId, categories[i].categories);
      if (found) {
        return found;
      }
    }
    return undefined;
  };

  const onMoveCategory = async (childId, newParentId) => {
    if (!childId || childId === newParentId) {
      return;
    }
    // Moving a category under its own descendant would create a cycle.
    const draggedCategory = isDescendantOf(childId, rootCategories);
    if (draggedCategory && isDescendantOf(newParentId, draggedCategory.categories)) {
      Alert.error(translate('react.category.moveIntoDescendant.message',
        'Cannot move a category into one of its own subcategories'));
      return;
    }
    spinner.show();
    try {
      await categoryApi.updateCategory(childId, { parentCategory: { id: newParentId } });
      Alert.success(translate('react.category.moved.message', 'Category moved successfully'));
      await fetchTree();
    } catch (error) {
      Alert.error(error.response?.data?.errorMessage ?? 'Unable to move category');
    } finally {
      spinner.hide();
    }
  };

  const onDeleteCategory = async (categoryId) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(translate('react.default.areYouSure.label', 'Are you sure?'))) {
      return;
    }
    spinner.show();
    try {
      await categoryApi.deleteCategory(categoryId);
      Alert.success(translate('react.category.deleted.message', 'Category deleted'));
      await fetchTree();
    } catch (error) {
      Alert.error(error.response?.data?.errorMessage
        ?? translate('react.category.notDeleted.message', 'Category could not be deleted'));
    } finally {
      spinner.hide();
    }
  };

  const onToggleAssigningParentToProduct = async () => {
    spinner.show();
    try {
      const { data } = await categoryApi
        .updateAssigningParentToProduct(!assigningParentToProductEnabled);
      setAssigningParentToProductEnabled(!!data?.data?.assigningParentToProductEnabled);
    } catch (error) {
      Alert.error(error.response?.data?.errorMessage ?? 'Unable to update setting');
    } finally {
      spinner.hide();
    }
  };

  const renderCategoryNode = (category) => (
    <React.Fragment key={category.id}>
      <li
        className={`category-tree-item ${dropTargetId === category.id ? 'category-tree-item-highlight' : ''}`}
        data-testid="category-tree-item"
        draggable
        onDragStart={(event) => {
          event.stopPropagation();
          setDraggedCategoryId(category.id);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDropTargetId(category.id);
        }}
        onDragLeave={() => setDropTargetId(null)}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setDropTargetId(null);
          onMoveCategory(draggedCategoryId, category.id);
        }}
      >
        <p className="d-flex align-items-center justify-content-between mb-0">
          <Link to={CATEGORY_URL.edit(category.id)}>{category.name}</Link>
          <span className="d-flex align-items-center gap-8">
            <RiDragMove2Line title="Move" />
            <Link to={CATEGORY_URL.edit(category.id)} title="Edit" aria-label="Edit category">
              <RiPencilLine />
            </Link>
            <button
              type="button"
              className="btn btn-link p-0 text-danger"
              title="Delete"
              aria-label="Delete category"
              onClick={() => onDeleteCategory(category.id)}
            >
              &#10005;
            </button>
          </span>
        </p>
      </li>
      {sortCategories(category.categories).length > 0 && (
        <ul className="category-tree">
          {sortCategories(category.categories).map((child) => renderCategoryNode(child))}
        </ul>
      )}
    </React.Fragment>
  );

  return (
    <PageWrapper>
      <div className="d-flex flex-column category-page p-3">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h3 className="mb-0">
            <Translate id="react.category.productCategories.label" defaultMessage="Product Categories" />
          </h3>
          <div className="d-flex align-items-center gap-8">
            {isAdmin && (
              <Button
                label="react.category.addCategory.label"
                defaultLabel="Add category"
                variant="primary"
                onClick={() => history.push(CATEGORY_URL.create())}
              />
            )}
            <select
              className="form-control category-root-select"
              data-testid="category-root-select"
              value={selectedCategory?.id ?? ''}
              onChange={(event) => history.push(CATEGORY_URL.tree(event.target.value))}
            >
              {rootCategories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
        </div>
        <ul className="category-tree" data-testid="category-tree">
          {selectedCategory && renderCategoryNode(selectedCategory)}
        </ul>
        {isSuperuser && (
          <div className="mt-3">
            <Button
              label={assigningParentToProductEnabled
                ? 'react.category.disableAssigningParentCategoryToProduct.label'
                : 'react.category.enableAssigningParentCategoryToProduct.label'}
              defaultLabel={assigningParentToProductEnabled
                ? 'Disable assigning parent category to product'
                : 'Enable assigning parent category to product'}
              variant="primary-outline"
              onClick={onToggleAssigningParentToProduct}
            />
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default CategoryTree;
