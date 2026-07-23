import {
  AUTH_LOGIN_API,
  AUTH_SIGNUP_API,
  AUTH_SIGNUP_CONFIG_API,
} from 'api/urls';
import { apiClientCustomResponseHandler } from 'utils/apiClient';

// Uses the custom-response-handler client so that a failed login/signup does
// not trigger the global 401 "session expired" login modal.
export default {
  login: (payload) => apiClientCustomResponseHandler.post(AUTH_LOGIN_API, payload),
  signup: (payload) => apiClientCustomResponseHandler.post(AUTH_SIGNUP_API, payload),
  getSignupConfig: () => apiClientCustomResponseHandler.get(AUTH_SIGNUP_CONFIG_API),
};
