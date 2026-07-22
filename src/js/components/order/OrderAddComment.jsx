import React, { useEffect, useMemo, useState } from 'react';

import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import Alert from 'react-s-alert';

import orderApi from 'api/services/OrderApi';
import { ORDER_URL } from 'consts/applicationUrls';
import useTranslation from 'hooks/useTranslation';
import { debounceUsersFetch } from 'utils/option-utils';
import Select from 'utils/Select';
import Translate from 'utils/Translate';

const OrderAddComment = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [recipient, setRecipient] = useState(null);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const { user, debounceTime, debounceMinSearchLength } = useSelector((state) => ({
    user: state.session.user,
    debounceTime: state.session.searchConfig.debounceTime,
    debounceMinSearchLength: state.session.searchConfig.minSearchLength,
  }));

  useTranslation('order', 'default');

  const debouncedUsersFetch = useMemo(
    () => debounceUsersFetch(debounceTime, debounceMinSearchLength),
    [debounceTime, debounceMinSearchLength],
  );

  useEffect(() => {
    orderApi.getOrder(orderId)
      .then(({ data }) => {
        setOrder(data?.data);
      })
      .catch((err) => {
        const message = err?.response?.data?.errorMessage;
        if (message) {
          Alert.error(message);
        }
      });
  }, [orderId]);

  const submit = async (event) => {
    event.preventDefault();
    if (!comment) {
      Alert.error('Please enter a comment');
      return;
    }
    setSaving(true);
    try {
      await orderApi.createComment(orderId, {
        comment,
        recipient: recipient ? { id: recipient.id } : null,
      });
      window.location = ORDER_URL.show(orderId);
    } catch (error) {
      const message = error?.response?.data?.errors?.join('; ')
        || error?.response?.data?.errorMessage;
      if (message) {
        Alert.error(message);
      }
      setSaving(false);
    }
  };

  return (
    <div className="d-flex flex-column m-3">
      <div className="card">
        <div className="card-header">
          <Translate id="react.order.addComment.label" defaultMessage="Add Comment" />
          {order?.orderNumber && ` · ${order.orderNumber}`}
          {order?.name && ` · ${order.name}`}
        </div>
        <form className="card-body" onSubmit={submit}>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="comment-sender-input">
              <Translate id="react.order.comment.sender.label" defaultMessage="Sender" />
            </label>
            <div className="col-sm-6">
              <input
                type="text"
                id="comment-sender-input"
                className="form-control"
                value={user?.name ?? ''}
                disabled
                data-testid="comment-sender-input"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="comment-recipient-select">
              <Translate id="react.order.comment.recipient.label" defaultMessage="Recipient" />
            </label>
            <div className="col-sm-6">
              <Select
                async
                loadOptions={debouncedUsersFetch}
                cache={false}
                options={[]}
                value={recipient}
                onChange={(value) => setRecipient(value)}
                id="comment-recipient-select"
              />
            </div>
          </div>
          <div className="form-group row">
            <label className="col-sm-3 col-form-label" htmlFor="comment-text-input">
              <Translate id="react.order.comment.comment.label" defaultMessage="Comment" />
            </label>
            <div className="col-sm-6">
              <textarea
                id="comment-text-input"
                className="form-control"
                rows={4}
                maxLength={255}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                data-testid="comment-text-input"
              />
            </div>
          </div>
          <div className="d-flex justify-content-center">
            <button type="submit" className="btn btn-primary mr-2" disabled={saving} data-testid="comment-save-button">
              <Translate id="react.default.button.save.label" defaultMessage="Save" />
            </button>
            <a className="btn btn-outline-secondary" href={ORDER_URL.show(orderId)}>
              <Translate id="react.default.button.cancel.label" defaultMessage="Cancel" />
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderAddComment;
